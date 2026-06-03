const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
const { env } = require('../../config/env');
const otpEmailService = require('./otp-email.service');

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const SESSION_TTL = '2h';
const JWT_SECRET = process.env.JWT_SECRET || 'fast-food-system-dev-secret';
const TEMP_LOCK_TTL_MS = 10 * 60 * 1000;
const pendingRegistrations = new Map();
const pendingLoginOtps = new Map();
const pendingAdminLoginOtps = new Map();
const pendingPasswordResets = new Map();
const failedAdminLoginAttempts = new Map();

const INTERNAL_ROLE_ACCESS = {
  ADMIN: {
    dashboardPath: '/admin',
    permissions: ['ADMIN_ACCESS', 'ADMIN_DASHBOARD', 'ORDER_MANAGE', 'KITCHEN_KDS', 'USER_MANAGE', 'DELIVERY_MANAGE', 'CUSTOMER_SUPPORT', 'MARKETING_MANAGE']
  },
  MANAGER: {
    dashboardPath: '/admin',
    permissions: ['ADMIN_ACCESS', 'ADMIN_DASHBOARD', 'ORDER_MANAGE', 'KITCHEN_KDS', 'USER_MANAGE', 'DELIVERY_MANAGE', 'CUSTOMER_SUPPORT', 'MARKETING_MANAGE']
  },
  KITCHEN: {
    dashboardPath: '/kitchen',
    permissions: ['ADMIN_ACCESS', 'KITCHEN_KDS']
  },
  DELIVERY: {
    dashboardPath: '/admin/delivery',
    permissions: ['ADMIN_ACCESS', 'DELIVERY_MANAGE']
  },
  CSKH: {
    dashboardPath: '/admin/orders',
    permissions: ['ADMIN_ACCESS', 'ORDER_MANAGE', 'CUSTOMER_SUPPORT']
  },
  MARKETING: {
    dashboardPath: '/admin/marketing',
    permissions: ['ADMIN_ACCESS', 'MARKETING_MANAGE']
  }
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizePhone = (phone) => String(phone || '').trim().replace(/[\s.-]/g, '');
const normalizeName = (name) => String(name || '').trim().replace(/\s+/g, ' ');

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => /^(0\d{9}|\+84\d{9})$/.test(phone);

const buildResult = (statusCode, message, errors = null) => ({
  ok: false,
  statusCode,
  message,
  errors
});

const validatePasswordStrength = (password) => {
  const value = String(password || '');
  const errors = [];

  if (value.length < 8) errors.push('Mật khẩu tối thiểu 8 ký tự');
  if (!/[a-z]/.test(value)) errors.push('Mật khẩu cần có chữ thường');
  if (!/[A-Z]/.test(value)) errors.push('Mật khẩu cần có chữ hoa');
  if (!/\d/.test(value)) errors.push('Mật khẩu cần có chữ số');
  if (!/[^A-Za-z0-9]/.test(value)) errors.push('Mật khẩu cần có ký tự đặc biệt');

  return errors;
};

const normalizeIdentifier = (identifier) => {
  const value = String(identifier || '').trim();

  if (value.includes('@')) {
    return {
      type: 'email',
      value: normalizeEmail(value)
    };
  }

  return {
    type: 'phone',
    value: normalizePhone(value)
  };
};

const validateIdentifier = (identifier) => {
  if (!identifier.value) {
    return 'Vui lòng nhập email hoặc số điện thoại';
  }

  if (identifier.type === 'email' && !isValidEmail(identifier.value)) {
    return 'Email không đúng định dạng';
  }

  if (identifier.type === 'phone' && !isValidPhone(identifier.value)) {
    return 'Số điện thoại không đúng định dạng';
  }

  return null;
};

const validateRegistrationPayload = (payload = {}) => {
  const fullName = normalizeName(payload.full_name);
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  const password = String(payload.password || '');
  const errors = {};

  if (!fullName) {
    errors.full_name = 'Vui lòng nhập họ tên';
  } else if (fullName.length > 100) {
    errors.full_name = 'Họ tên không được vượt quá 100 ký tự';
  }

  if (!email && !phone) {
    errors.contact = 'Vui lòng nhập email hoặc số điện thoại';
  }

  if (email && !isValidEmail(email)) {
    errors.email = 'Email không đúng định dạng';
  }

  if (phone && !isValidPhone(phone)) {
    errors.phone = 'Số điện thoại không đúng định dạng';
  }

  const passwordErrors = validatePasswordStrength(password);
  if (passwordErrors.length) {
    errors.password = passwordErrors.join('. ');
  }

  return {
    errors,
    values: {
      fullName,
      email: email || null,
      phone: phone || null,
      password
    }
  };
};

const findExistingAccount = async ({ email, phone }) => {
  const conditions = [];
  const params = [];

  if (email) {
    conditions.push('email = ?');
    params.push(email);
  }

  if (phone) {
    conditions.push('phone = ?');
    params.push(phone);
  }

  if (!conditions.length) return null;

  const [rows] = await pool.query(
    `
      SELECT user_id, email, phone
      FROM users
      WHERE ${conditions.join(' OR ')}
      LIMIT 1
    `,
    params
  );

  return rows[0] || null;
};

const getCustomerRoleId = async () => {
  const [rows] = await pool.query(
    `
      SELECT role_id
      FROM roles
      WHERE role_name = 'CUSTOMER'
      LIMIT 1
    `
  );

  return rows[0]?.role_id || null;
};

const findAccountByIdentifier = async (identifier) => {
  const [rows] = await pool.query(
    `
      SELECT
        users.user_id,
        users.role_id,
        roles.role_name,
        users.full_name,
        users.email,
        users.phone,
        users.password_hash,
        users.status,
        users.total_points,
        users.created_at
      FROM users
      JOIN roles ON roles.role_id = users.role_id
      WHERE ${identifier.type === 'email' ? 'users.email = ?' : 'users.phone = ?'}
      LIMIT 1
    `,
    [identifier.value]
  );

  return rows[0] || null;
};

const findAccountById = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT
        users.user_id,
        users.role_id,
        roles.role_name,
        users.full_name,
        users.email,
        users.phone,
        users.status,
        users.total_points,
        users.created_at
      FROM users
      JOIN roles ON roles.role_id = users.role_id
      WHERE users.user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

const toPublicAccount = (account) => ({
  user_id: account.user_id,
  role_id: account.role_id,
  role_name: account.role_name,
  full_name: account.full_name,
  email: account.email,
  phone: account.phone,
  status: account.status,
  total_points: account.total_points,
  created_at: account.created_at
});

const validateAccountCanLogin = (account) => {
  if (!account) {
    return buildResult(401, 'Email/số điện thoại hoặc thông tin xác thực không đúng');
  }

  if (account.status === 'LOCKED') {
    return buildResult(423, 'Tài khoản bị khóa. Vui lòng liên hệ CSKH để được hỗ trợ.');
  }

  if (account.status !== 'ACTIVE') {
    return buildResult(403, 'Tài khoản chưa sẵn sàng đăng nhập');
  }

  return null;
};

const createSession = (account) => {
  const token = jwt.sign(
    {
      sub: String(account.user_id),
      role: account.role_name
    },
    JWT_SECRET,
    { expiresIn: SESSION_TTL }
  );

  return {
    token,
    token_type: 'Bearer',
    expires_in_seconds: 2 * 60 * 60,
    user: toPublicAccount(account)
  };
};

const createAdminSession = (account, access) => {
  const token = jwt.sign(
    {
      sub: String(account.user_id),
      role: account.role_name,
      scope: 'admin'
    },
    JWT_SECRET,
    { expiresIn: SESSION_TTL }
  );

  return {
    token,
    token_type: 'Bearer',
    expires_in_seconds: 2 * 60 * 60,
    user: toPublicAccount(account),
    permissions: access.permissions,
    dashboard_path: access.dashboardPath
  };
};

const getInternalAccess = (account) => INTERNAL_ROLE_ACCESS[String(account?.role_name || '').toUpperCase()] || null;

const buildUnauthorizedAdminResult = () =>
  buildResult(403, 'Tài khoản chưa được phân quyền truy cập hệ thống quản trị');

const validateAccountCanAdminLogin = (account) => {
  const accountError = validateAccountCanLogin(account);

  if (accountError) return accountError;

  const access = getInternalAccess(account);

  if (!access) {
    return buildUnauthorizedAdminResult();
  }

  return null;
};

const cleanupExpiredRegistrations = () => {
  const now = Date.now();

  for (const [token, registration] of pendingRegistrations.entries()) {
    if (registration.expiresAt <= now) {
      pendingRegistrations.delete(token);
    }
  }
};

const cleanupExpiredLoginOtps = () => {
  const now = Date.now();

  for (const [token, loginOtp] of pendingLoginOtps.entries()) {
    if (loginOtp.expiresAt <= now) {
      pendingLoginOtps.delete(token);
    }
  }

  for (const [token, loginOtp] of pendingAdminLoginOtps.entries()) {
    if (loginOtp.expiresAt <= now) {
      pendingAdminLoginOtps.delete(token);
    }
  }

  for (const [token, resetOtp] of pendingPasswordResets.entries()) {
    if (resetOtp.expiresAt <= now) {
      pendingPasswordResets.delete(token);
    }
  }
};

const createOtp = () => String(crypto.randomInt(100000, 1000000));

const getAdminAttemptKey = (identifier) => `${identifier.type}:${identifier.value}`;

const getActiveAdminLock = (identifier) => {
  const key = getAdminAttemptKey(identifier);
  const attempt = failedAdminLoginAttempts.get(key);

  if (!attempt?.lockedUntil) return null;

  if (attempt.lockedUntil <= Date.now()) {
    failedAdminLoginAttempts.delete(key);
    return null;
  }

  return attempt;
};

const recordFailedAdminLogin = (identifier) => {
  const key = getAdminAttemptKey(identifier);
  const attempt = failedAdminLoginAttempts.get(key) || { count: 0, lockedUntil: null };
  const count = attempt.count + 1;
  const lockedUntil = count >= MAX_VERIFY_ATTEMPTS ? Date.now() + TEMP_LOCK_TTL_MS : null;

  failedAdminLoginAttempts.set(key, { count, lockedUntil });

  if (lockedUntil) {
    return buildResult(423, 'Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau 10 phút.');
  }

  return buildResult(401, 'Tài khoản hoặc thông tin xác thực không đúng', {
    credentials: 'Thông tin đăng nhập không đúng'
  });
};

const clearFailedAdminLogin = (identifier) => {
  failedAdminLoginAttempts.delete(getAdminAttemptKey(identifier));
};

const writeAdminLoginLog = ({ account, method }) => {
  console.info(`[ADMIN_LOGIN] user_id=${account.user_id} role=${account.role_name} method=${method} at=${new Date().toISOString()}`);
};

const loginWithPassword = async ({ identifier, password }) => {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const identifierError = validateIdentifier(normalizedIdentifier);

  if (identifierError) {
    return buildResult(400, 'Thông tin đăng nhập không hợp lệ', { identifier: identifierError });
  }

  if (!String(password || '')) {
    return buildResult(400, 'Thông tin đăng nhập không hợp lệ', { password: 'Vui lòng nhập mật khẩu' });
  }

  const account = await findAccountByIdentifier(normalizedIdentifier);
  const accountError = validateAccountCanLogin(account);

  if (accountError) return accountError;

  const isPasswordValid = await bcrypt.compare(String(password), account.password_hash || '');

  if (!isPasswordValid) {
    return buildResult(401, 'Email/số điện thoại hoặc mật khẩu không đúng', {
      password: 'Mật khẩu không đúng'
    });
  }

  return {
    ok: true,
    data: createSession(account)
  };
};

const loginAdminWithPassword = async ({ identifier, password }) => {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const identifierError = validateIdentifier(normalizedIdentifier);

  if (identifierError) {
    return buildResult(400, 'Thông tin đăng nhập quản trị không hợp lệ', { identifier: identifierError });
  }

  const activeLock = getActiveAdminLock(normalizedIdentifier);

  if (activeLock) {
    return buildResult(423, 'Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau 10 phút.');
  }

  if (!String(password || '')) {
    return buildResult(400, 'Thông tin đăng nhập quản trị không hợp lệ', { password: 'Vui lòng nhập mật khẩu' });
  }

  const account = await findAccountByIdentifier(normalizedIdentifier);
  const accountError = validateAccountCanAdminLogin(account);

  if (accountError) {
    if (accountError.statusCode === 401) {
      return recordFailedAdminLogin(normalizedIdentifier);
    }

    return accountError;
  }

  const isPasswordValid = await bcrypt.compare(String(password), account.password_hash || '');

  if (!isPasswordValid) {
    return recordFailedAdminLogin(normalizedIdentifier);
  }

  const access = getInternalAccess(account);
  clearFailedAdminLogin(normalizedIdentifier);
  writeAdminLoginLog({ account, method: 'PASSWORD' });

  return {
    ok: true,
    data: createAdminSession(account, access)
  };
};

const requestAdminLoginOtp = async ({ identifier }) => {
  cleanupExpiredLoginOtps();

  const normalizedIdentifier = normalizeIdentifier(identifier);
  const identifierError = validateIdentifier(normalizedIdentifier);

  if (identifierError) {
    return buildResult(400, 'Thông tin đăng nhập quản trị không hợp lệ', { identifier: identifierError });
  }

  const activeLock = getActiveAdminLock(normalizedIdentifier);

  if (activeLock) {
    return buildResult(423, 'Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau 10 phút.');
  }

  const account = await findAccountByIdentifier(normalizedIdentifier);
  const accountError = validateAccountCanAdminLogin(account);

  if (accountError) {
    if (accountError.statusCode === 401) {
      return recordFailedAdminLogin(normalizedIdentifier);
    }

    return accountError;
  }

  const receiver = normalizedIdentifier.type === 'email' ? account.email : account.phone;

  if (!receiver) {
    return buildResult(400, 'Tài khoản chưa có kênh nhận OTP phù hợp');
  }

  const code = createOtp();
  const token = crypto.randomBytes(24).toString('hex');
  const channel = normalizedIdentifier.type === 'email' ? 'EMAIL' : 'SMS';

  pendingAdminLoginOtps.set(token, {
    userId: account.user_id,
    identifier: normalizedIdentifier,
    code,
    channel,
    receiver,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0
  });

  await otpEmailService.sendVerificationCode({ channel, receiver, code });

  const data = {
    verification_token: token,
    channel,
    receiver: otpEmailService.maskReceiver(receiver),
    expires_in_seconds: Math.floor(OTP_TTL_MS / 1000)
  };

  if (env.nodeEnv !== 'production') {
    data.dev_otp = code;
  }

  return {
    ok: true,
    data
  };
};

const verifyAdminLoginOtp = async ({ verificationToken, otp }) => {
  cleanupExpiredLoginOtps();

  const token = String(verificationToken || '').trim();
  const code = String(otp || '').trim();
  const loginOtp = pendingAdminLoginOtps.get(token);

  if (!loginOtp) {
    return buildResult(400, 'OTP sai hoặc đã hết hạn. Vui lòng gửi lại mã.');
  }

  if (!/^\d{6}$/.test(code)) {
    return buildResult(400, 'Mã OTP gồm 6 chữ số', { otp: 'Mã OTP gồm 6 chữ số' });
  }

  if (loginOtp.expiresAt <= Date.now()) {
    pendingAdminLoginOtps.delete(token);
    return buildResult(400, 'OTP đã hết hạn. Vui lòng gửi lại mã.');
  }

  if (loginOtp.code !== code) {
    loginOtp.attempts += 1;

    if (loginOtp.attempts >= MAX_VERIFY_ATTEMPTS) {
      pendingAdminLoginOtps.delete(token);
      recordFailedAdminLogin(loginOtp.identifier);
      return buildResult(400, 'OTP sai quá số lần cho phép. Vui lòng đăng nhập lại.');
    }

    pendingAdminLoginOtps.set(token, loginOtp);
    return buildResult(400, 'OTP không đúng. Vui lòng kiểm tra lại.', { otp: 'OTP không đúng' });
  }

  const account = await findAccountById(loginOtp.userId);
  const accountError = validateAccountCanAdminLogin(account);

  if (accountError) {
    pendingAdminLoginOtps.delete(token);
    return accountError;
  }

  const access = getInternalAccess(account);
  pendingAdminLoginOtps.delete(token);
  clearFailedAdminLogin(loginOtp.identifier);
  writeAdminLoginLog({ account, method: 'OTP' });

  return {
    ok: true,
    data: createAdminSession(account, access)
  };
};

const requestLoginOtp = async ({ identifier }) => {
  cleanupExpiredLoginOtps();

  const normalizedIdentifier = normalizeIdentifier(identifier);
  const identifierError = validateIdentifier(normalizedIdentifier);

  if (identifierError) {
    return buildResult(400, 'Thông tin đăng nhập không hợp lệ', { identifier: identifierError });
  }

  const account = await findAccountByIdentifier(normalizedIdentifier);
  const accountError = validateAccountCanLogin(account);

  if (accountError) return accountError;

  const receiver = normalizedIdentifier.type === 'email' ? account.email : account.phone;

  if (!receiver) {
    return buildResult(400, 'Tài khoản chưa có kênh nhận OTP phù hợp');
  }

  const code = createOtp();
  const token = crypto.randomBytes(24).toString('hex');
  const channel = normalizedIdentifier.type === 'email' ? 'EMAIL' : 'SMS';

  pendingLoginOtps.set(token, {
    userId: account.user_id,
    code,
    channel,
    receiver,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0
  });

  await otpEmailService.sendVerificationCode({ channel, receiver, code });

  const data = {
    verification_token: token,
    channel,
    receiver: otpEmailService.maskReceiver(receiver),
    expires_in_seconds: Math.floor(OTP_TTL_MS / 1000)
  };

  if (env.nodeEnv !== 'production') {
    data.dev_otp = code;
  }

  return {
    ok: true,
    data
  };
};

const verifyLoginOtp = async ({ verificationToken, otp }) => {
  cleanupExpiredLoginOtps();

  const token = String(verificationToken || '').trim();
  const code = String(otp || '').trim();
  const loginOtp = pendingLoginOtps.get(token);

  if (!loginOtp) {
    return buildResult(400, 'OTP sai hoặc đã hết hạn. Vui lòng gửi lại mã.');
  }

  if (!/^\d{6}$/.test(code)) {
    return buildResult(400, 'Mã OTP gồm 6 chữ số', { otp: 'Mã OTP gồm 6 chữ số' });
  }

  if (loginOtp.expiresAt <= Date.now()) {
    pendingLoginOtps.delete(token);
    return buildResult(400, 'OTP đã hết hạn. Vui lòng gửi lại mã.');
  }

  if (loginOtp.code !== code) {
    loginOtp.attempts += 1;

    if (loginOtp.attempts >= MAX_VERIFY_ATTEMPTS) {
      pendingLoginOtps.delete(token);
      return buildResult(400, 'OTP sai quá số lần cho phép. Vui lòng đăng nhập lại.');
    }

    pendingLoginOtps.set(token, loginOtp);
    return buildResult(400, 'OTP không đúng. Vui lòng kiểm tra lại.', { otp: 'OTP không đúng' });
  }

  const account = await findAccountById(loginOtp.userId);
  const accountError = validateAccountCanLogin(account);

  if (accountError) {
    pendingLoginOtps.delete(token);
    return accountError;
  }

  pendingLoginOtps.delete(token);

  return {
    ok: true,
    data: createSession(account)
  };
};

const getCurrentUser = async (authorizationHeader) => {
  const [scheme, token] = String(authorizationHeader || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return buildResult(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const account = await findAccountById(decoded.sub);
    const accountError = validateAccountCanLogin(account);

    if (accountError) return accountError;

    return {
      ok: true,
      data: toPublicAccount(account)
    };
  } catch (error) {
    return buildResult(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }
};

const getCurrentAdminUser = async (authorizationHeader) => {
  const [scheme, token] = String(authorizationHeader || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return buildResult(401, 'Phiên đăng nhập quản trị đã hết hạn. Vui lòng đăng nhập lại.');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.scope !== 'admin') {
      return buildUnauthorizedAdminResult();
    }

    const account = await findAccountById(decoded.sub);
    const accountError = validateAccountCanAdminLogin(account);

    if (accountError) return accountError;

    const access = getInternalAccess(account);

    return {
      ok: true,
      data: {
        user: toPublicAccount(account),
        permissions: access.permissions,
        dashboard_path: access.dashboardPath
      }
    };
  } catch (error) {
    return buildResult(401, 'Phiên đăng nhập quản trị đã hết hạn. Vui lòng đăng nhập lại.');
  }
};

const logout = async () => ({
  ok: true,
  data: {
    logged_out: true
  }
});

const startRegistration = async (payload) => {
  cleanupExpiredRegistrations();

  const { errors, values } = validateRegistrationPayload(payload);

  if (Object.keys(errors).length) {
    return buildResult(400, 'Thông tin đăng ký không hợp lệ', errors);
  }

  const existingAccount = await findExistingAccount(values);

  if (existingAccount) {
    return buildResult(409, 'Tài khoản đã tồn tại. Vui lòng đăng nhập hoặc lấy lại mật khẩu.', {
      account: 'Email hoặc số điện thoại đã được sử dụng'
    });
  }

  const code = createOtp();
  const token = crypto.randomBytes(24).toString('hex');
  const channel = values.email ? 'EMAIL' : 'SMS';
  const receiver = values.email || values.phone;
  const expiresAt = Date.now() + OTP_TTL_MS;

  pendingRegistrations.set(token, {
    ...values,
    code,
    channel,
    receiver,
    expiresAt,
    attempts: 0
  });

  await otpEmailService.sendVerificationCode({ channel, receiver, code });

  const data = {
    verification_token: token,
    channel,
    receiver: otpEmailService.maskReceiver(receiver),
    expires_in_seconds: Math.floor(OTP_TTL_MS / 1000)
  };

  if (env.nodeEnv !== 'production') {
    data.dev_otp = code;
  }

  return {
    ok: true,
    data
  };
};

const resendRegistrationOtp = async ({ verificationToken }) => {
  cleanupExpiredRegistrations();

  const token = String(verificationToken || '').trim();
  const registration = pendingRegistrations.get(token);

  if (!registration) {
    return buildResult(400, 'Phiên đăng ký không tồn tại hoặc đã hết hạn');
  }

  const code = createOtp();
  registration.code = code;
  registration.expiresAt = Date.now() + OTP_TTL_MS;
  registration.attempts = 0;
  pendingRegistrations.set(token, registration);

  await otpEmailService.sendVerificationCode({
    channel: registration.channel,
    receiver: registration.receiver,
    code
  });

  const data = {
    verification_token: token,
    channel: registration.channel,
    receiver: otpEmailService.maskReceiver(registration.receiver),
    expires_in_seconds: Math.floor(OTP_TTL_MS / 1000)
  };

  if (env.nodeEnv !== 'production') {
    data.dev_otp = code;
  }

  return {
    ok: true,
    data
  };
};

const verifyRegistration = async ({ verificationToken, otp }) => {
  cleanupExpiredRegistrations();

  const token = String(verificationToken || '').trim();
  const code = String(otp || '').trim();
  const registration = pendingRegistrations.get(token);

  if (!registration) {
    return buildResult(400, 'OTP sai hoặc đã hết hạn. Vui lòng gửi lại mã.');
  }

  if (!/^\d{6}$/.test(code)) {
    return buildResult(400, 'Mã OTP gồm 6 chữ số', { otp: 'Mã OTP gồm 6 chữ số' });
  }

  if (registration.expiresAt <= Date.now()) {
    pendingRegistrations.delete(token);
    return buildResult(400, 'OTP đã hết hạn. Vui lòng gửi lại mã.');
  }

  if (registration.code !== code) {
    registration.attempts += 1;

    if (registration.attempts >= MAX_VERIFY_ATTEMPTS) {
      pendingRegistrations.delete(token);
      return buildResult(400, 'OTP sai quá số lần cho phép. Vui lòng đăng ký lại.');
    }

    pendingRegistrations.set(token, registration);
    return buildResult(400, 'OTP không đúng. Vui lòng kiểm tra lại.', { otp: 'OTP không đúng' });
  }

  const existingAccount = await findExistingAccount(registration);

  if (existingAccount) {
    pendingRegistrations.delete(token);
    return buildResult(409, 'Tài khoản đã tồn tại. Vui lòng đăng nhập hoặc lấy lại mật khẩu.', {
      account: 'Email hoặc số điện thoại đã được sử dụng'
    });
  }

  const roleId = await getCustomerRoleId();

  if (!roleId) {
    return buildResult(500, 'Hệ thống chưa cấu hình vai trò CUSTOMER');
  }

  const passwordHash = await bcrypt.hash(registration.password, 10);
  const [insertResult] = await pool.query(
    `
      INSERT INTO users (role_id, full_name, email, phone, password_hash, status)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE')
    `,
    [roleId, registration.fullName, registration.email, registration.phone, passwordHash]
  );

  pendingRegistrations.delete(token);

  return {
    ok: true,
    data: {
      user_id: insertResult.insertId,
      full_name: registration.fullName,
      email: registration.email,
      phone: registration.phone,
      status: 'ACTIVE'
    }
  };
};

const requestPasswordReset = async ({ identifier }) => {
  cleanupExpiredLoginOtps();

  const normalizedIdentifier = normalizeIdentifier(identifier);
  const identifierError = validateIdentifier(normalizedIdentifier);

  if (identifierError) {
    return buildResult(400, 'Thông tin khôi phục mật khẩu không hợp lệ', { identifier: identifierError });
  }

  const account = await findAccountByIdentifier(normalizedIdentifier);
  const accountError = validateAccountCanLogin(account);

  if (accountError) return accountError;

  const receiver = normalizedIdentifier.type === 'email' ? account.email : account.phone;
  if (!receiver) {
    return buildResult(400, 'Tài khoản chưa có kênh nhận OTP phù hợp');
  }

  const code = createOtp();
  const token = crypto.randomBytes(24).toString('hex');
  const channel = normalizedIdentifier.type === 'email' ? 'EMAIL' : 'SMS';

  pendingPasswordResets.set(token, {
    userId: account.user_id,
    code,
    channel,
    receiver,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0
  });

  await otpEmailService.sendVerificationCode({ channel, receiver, code });

  const data = {
    verification_token: token,
    channel,
    receiver: otpEmailService.maskReceiver(receiver),
    expires_in_seconds: Math.floor(OTP_TTL_MS / 1000)
  };

  if (env.nodeEnv !== 'production') {
    data.dev_otp = code;
  }

  return {
    ok: true,
    data
  };
};

const resetPassword = async ({ verificationToken, otp, password }) => {
  cleanupExpiredLoginOtps();

  const token = String(verificationToken || '').trim();
  const code = String(otp || '').trim();
  const resetOtp = pendingPasswordResets.get(token);

  if (!resetOtp) {
    return buildResult(400, 'OTP sai hoặc đã hết hạn. Vui lòng gửi lại mã.');
  }

  if (!/^\d{6}$/.test(code)) {
    return buildResult(400, 'Mã OTP gồm 6 chữ số', { otp: 'Mã OTP gồm 6 chữ số' });
  }

  if (resetOtp.expiresAt <= Date.now()) {
    pendingPasswordResets.delete(token);
    return buildResult(400, 'OTP đã hết hạn. Vui lòng gửi lại mã.');
  }

  if (resetOtp.code !== code) {
    resetOtp.attempts += 1;

    if (resetOtp.attempts >= MAX_VERIFY_ATTEMPTS) {
      pendingPasswordResets.delete(token);
      return buildResult(400, 'OTP sai quá số lần cho phép. Vui lòng thực hiện lại.');
    }

    pendingPasswordResets.set(token, resetOtp);
    return buildResult(400, 'OTP không đúng. Vui lòng kiểm tra lại.', { otp: 'OTP không đúng' });
  }

  const passwordErrors = validatePasswordStrength(password);
  if (passwordErrors.length) {
    return buildResult(400, 'Mật khẩu mới không đạt yêu cầu', { password: passwordErrors.join('. ') });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  await pool.query('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [
    passwordHash,
    resetOtp.userId
  ]);

  pendingPasswordResets.delete(token);

  return {
    ok: true,
    data: {
      password_reset: true
    }
  };
};

module.exports = {
  loginWithPassword,
  requestLoginOtp,
  verifyLoginOtp,
  loginAdminWithPassword,
  requestAdminLoginOtp,
  verifyAdminLoginOtp,
  getCurrentAdminUser,
  getCurrentUser,
  logout,
  startRegistration,
  resendRegistrationOtp,
  verifyRegistration,
  requestPasswordReset,
  resetPassword
};
