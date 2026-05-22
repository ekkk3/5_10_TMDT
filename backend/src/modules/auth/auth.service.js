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
const pendingRegistrations = new Map();
const pendingLoginOtps = new Map();

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

  if (value.length < 8) errors.push('Mat khau toi thieu 8 ky tu');
  if (!/[a-z]/.test(value)) errors.push('Mat khau can co chu thuong');
  if (!/[A-Z]/.test(value)) errors.push('Mat khau can co chu hoa');
  if (!/\d/.test(value)) errors.push('Mat khau can co chu so');
  if (!/[^A-Za-z0-9]/.test(value)) errors.push('Mat khau can co ky tu dac biet');

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
    return 'Vui long nhap email hoac so dien thoai';
  }

  if (identifier.type === 'email' && !isValidEmail(identifier.value)) {
    return 'Email khong dung dinh dang';
  }

  if (identifier.type === 'phone' && !isValidPhone(identifier.value)) {
    return 'So dien thoai khong dung dinh dang';
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
    errors.full_name = 'Vui long nhap ho ten';
  } else if (fullName.length > 100) {
    errors.full_name = 'Ho ten khong duoc vuot qua 100 ky tu';
  }

  if (!email && !phone) {
    errors.contact = 'Vui long nhap email hoac so dien thoai';
  }

  if (email && !isValidEmail(email)) {
    errors.email = 'Email khong dung dinh dang';
  }

  if (phone && !isValidPhone(phone)) {
    errors.phone = 'So dien thoai khong dung dinh dang';
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
    return buildResult(401, 'Email/so dien thoai hoac thong tin xac thuc khong dung');
  }

  if (account.status === 'LOCKED') {
    return buildResult(423, 'Tai khoan bi khoa. Vui long lien he CSKH de duoc ho tro.');
  }

  if (account.status !== 'ACTIVE') {
    return buildResult(403, 'Tai khoan chua san sang dang nhap');
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
};

const createOtp = () => String(crypto.randomInt(100000, 1000000));

const loginWithPassword = async ({ identifier, password }) => {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const identifierError = validateIdentifier(normalizedIdentifier);

  if (identifierError) {
    return buildResult(400, 'Thong tin dang nhap khong hop le', { identifier: identifierError });
  }

  if (!String(password || '')) {
    return buildResult(400, 'Thong tin dang nhap khong hop le', { password: 'Vui long nhap mat khau' });
  }

  const account = await findAccountByIdentifier(normalizedIdentifier);
  const accountError = validateAccountCanLogin(account);

  if (accountError) return accountError;

  const isPasswordValid = await bcrypt.compare(String(password), account.password_hash || '');

  if (!isPasswordValid) {
    return buildResult(401, 'Email/so dien thoai hoac mat khau khong dung', {
      password: 'Mat khau khong dung'
    });
  }

  return {
    ok: true,
    data: createSession(account)
  };
};

const requestLoginOtp = async ({ identifier }) => {
  cleanupExpiredLoginOtps();

  const normalizedIdentifier = normalizeIdentifier(identifier);
  const identifierError = validateIdentifier(normalizedIdentifier);

  if (identifierError) {
    return buildResult(400, 'Thong tin dang nhap khong hop le', { identifier: identifierError });
  }

  const account = await findAccountByIdentifier(normalizedIdentifier);
  const accountError = validateAccountCanLogin(account);

  if (accountError) return accountError;

  const receiver = normalizedIdentifier.type === 'email' ? account.email : account.phone;

  if (!receiver) {
    return buildResult(400, 'Tai khoan chua co kenh nhan OTP phu hop');
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
    return buildResult(400, 'OTP sai hoac da het han. Vui long gui lai ma.');
  }

  if (!/^\d{6}$/.test(code)) {
    return buildResult(400, 'Ma OTP gom 6 chu so', { otp: 'Ma OTP gom 6 chu so' });
  }

  if (loginOtp.expiresAt <= Date.now()) {
    pendingLoginOtps.delete(token);
    return buildResult(400, 'OTP da het han. Vui long gui lai ma.');
  }

  if (loginOtp.code !== code) {
    loginOtp.attempts += 1;

    if (loginOtp.attempts >= MAX_VERIFY_ATTEMPTS) {
      pendingLoginOtps.delete(token);
      return buildResult(400, 'OTP sai qua so lan cho phep. Vui long dang nhap lai.');
    }

    pendingLoginOtps.set(token, loginOtp);
    return buildResult(400, 'OTP khong dung. Vui long kiem tra lai.', { otp: 'OTP khong dung' });
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
    return buildResult(401, 'Phien dang nhap da het han. Vui long dang nhap lai.');
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
    return buildResult(401, 'Phien dang nhap da het han. Vui long dang nhap lai.');
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
    return buildResult(400, 'Thong tin dang ky khong hop le', errors);
  }

  const existingAccount = await findExistingAccount(values);

  if (existingAccount) {
    return buildResult(409, 'Tai khoan da ton tai. Vui long dang nhap hoac lay lai mat khau.', {
      account: 'Email hoac so dien thoai da duoc su dung'
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
    return buildResult(400, 'Phien dang ky khong ton tai hoac da het han');
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
    return buildResult(400, 'OTP sai hoac da het han. Vui long gui lai ma.');
  }

  if (!/^\d{6}$/.test(code)) {
    return buildResult(400, 'Ma OTP gom 6 chu so', { otp: 'Ma OTP gom 6 chu so' });
  }

  if (registration.expiresAt <= Date.now()) {
    pendingRegistrations.delete(token);
    return buildResult(400, 'OTP da het han. Vui long gui lai ma.');
  }

  if (registration.code !== code) {
    registration.attempts += 1;

    if (registration.attempts >= MAX_VERIFY_ATTEMPTS) {
      pendingRegistrations.delete(token);
      return buildResult(400, 'OTP sai qua so lan cho phep. Vui long dang ky lai.');
    }

    pendingRegistrations.set(token, registration);
    return buildResult(400, 'OTP khong dung. Vui long kiem tra lai.', { otp: 'OTP khong dung' });
  }

  const existingAccount = await findExistingAccount(registration);

  if (existingAccount) {
    pendingRegistrations.delete(token);
    return buildResult(409, 'Tai khoan da ton tai. Vui long dang nhap hoac lay lai mat khau.', {
      account: 'Email hoac so dien thoai da duoc su dung'
    });
  }

  const roleId = await getCustomerRoleId();

  if (!roleId) {
    return buildResult(500, 'He thong chua cau hinh vai tro CUSTOMER');
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

module.exports = {
  loginWithPassword,
  requestLoginOtp,
  verifyLoginOtp,
  getCurrentUser,
  logout,
  startRegistration,
  resendRegistrationOtp,
  verifyRegistration
};
