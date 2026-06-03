const bcrypt = require('bcryptjs');
const pool = require('../../config/database');

const INTERNAL_ROLES = new Set(['ADMIN', 'MANAGER', 'KITCHEN', 'DELIVERY', 'CSKH', 'MARKETING']);
const USER_STATUSES = new Set(['ACTIVE', 'LOCKED', 'INACTIVE']);

const buildError = (statusCode, message, errors = null) => ({
  ok: false,
  statusCode,
  message,
  errors
});

const normalizeText = (value) => String(value || '').trim();
const normalizeName = (value) => normalizeText(value).replace(/\s+/g, ' ');
const normalizeEmail = (value) => normalizeText(value).toLowerCase();
const normalizePhone = (value) => normalizeText(value).replace(/[\s.-]/g, '');
const normalizeRole = (value) => normalizeText(value).toUpperCase();
const normalizeStatus = (value) => normalizeText(value).toUpperCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPhone = (value) => /^(0\d{9}|\+84\d{9})$/.test(value);

const mapUser = (user) => ({
  user_id: Number(user.user_id),
  role_id: Number(user.role_id),
  role_name: user.role_name,
  full_name: user.full_name,
  email: user.email,
  phone: user.phone,
  status: user.status,
  created_at: user.created_at,
  updated_at: user.updated_at
});

const listUsers = async (filters = {}) => {
  const where = [];
  const params = [];
  const role = normalizeRole(filters.role);
  const status = normalizeStatus(filters.status);
  const keyword = normalizeText(filters.keyword);

  if (role) {
    where.push('r.role_name = ?');
    params.push(role);
  }

  if (status) {
    if (!USER_STATUSES.has(status)) {
      return buildError(400, 'Trạng thái tài khoản không hợp lệ', { status: 'Trạng thái không được hỗ trợ' });
    }

    where.push('u.status = ?');
    params.push(status);
  }

  if (keyword) {
    const likeKeyword = `%${keyword}%`;
    where.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR r.role_name LIKE ?)');
    params.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [users] = await pool.query(
    `
      SELECT u.user_id, u.role_id, r.role_name, u.full_name, u.email, u.phone, u.status, u.created_at, u.updated_at
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      ${whereSql}
      ORDER BY
        CASE WHEN r.role_name IN ('ADMIN','MANAGER','KITCHEN','CSKH','MARKETING','DELIVERY') THEN 0 ELSE 1 END,
        u.created_at DESC,
        u.user_id DESC
      LIMIT 150
    `,
    params
  );

  const [roles] = await pool.query(
    `
      SELECT role_id, role_name, description
      FROM roles
      ORDER BY role_name ASC
    `
  );

  return {
    ok: true,
    data: {
      users: users.map(mapUser),
      roles: roles.map((roleRow) => ({
        role_id: Number(roleRow.role_id),
        role_name: roleRow.role_name,
        description: roleRow.description,
        is_internal: INTERNAL_ROLES.has(roleRow.role_name)
      }))
    }
  };
};

const getRoleByName = async (roleName) => {
  const [roles] = await pool.query('SELECT role_id, role_name FROM roles WHERE role_name = ? LIMIT 1', [roleName]);
  return roles[0] || null;
};

const validateUserPayload = async (payload = {}, { partial = false } = {}) => {
  const errors = {};
  const fullName = normalizeName(payload.full_name);
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  const roleName = normalizeRole(payload.role_name);
  const status = normalizeStatus(payload.status || 'ACTIVE');
  const password = String(payload.password || '');

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'full_name')) {
    if (!fullName) errors.full_name = 'Vui lòng nhập họ tên';
    else if (fullName.length > 100) errors.full_name = 'Họ tên không được vượt quá 100 ký tự';
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'email')) {
    if (email && !isValidEmail(email)) errors.email = 'Email không đúng định dạng';
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    if (phone && !isValidPhone(phone)) errors.phone = 'Số điện thoại không đúng định dạng';
  }

  if (!partial && !email && !phone) {
    errors.contact = 'Vui lòng nhập email hoặc số điện thoại';
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'role_name')) {
    if (!INTERNAL_ROLES.has(roleName)) {
      errors.role_name = 'Chỉ được gán vai trò nhân viên nội bộ';
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'status')) {
    if (!USER_STATUSES.has(status)) {
      errors.status = 'Trạng thái tài khoản không hợp lệ';
    }
  }

  if (!partial && password.length < 8) {
    errors.password = 'Mật khẩu tối thiểu 8 ký tự';
  }

  const role = roleName && INTERNAL_ROLES.has(roleName) ? await getRoleByName(roleName) : null;
  if (roleName && INTERNAL_ROLES.has(roleName) && !role) {
    errors.role_name = 'Hệ thống chưa cấu hình vai trò này';
  }

  return {
    errors,
    values: {
      fullName,
      email: email || null,
      phone: phone || null,
      role,
      status,
      password
    }
  };
};

const ensureUniqueContact = async ({ email, phone, excludeUserId = null }) => {
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

  if (!conditions.length) {
    return null;
  }

  let sql = `SELECT user_id, email, phone FROM users WHERE (${conditions.join(' OR ')})`;
  if (excludeUserId) {
    sql += ' AND user_id <> ?';
    params.push(excludeUserId);
  }
  sql += ' LIMIT 1';

  const [users] = await pool.query(sql, params);
  return users[0] || null;
};

const writeSystemLog = async (connection, actor, action, objectId, description) => {
  await connection.query(
    `
      INSERT INTO system_logs (user_id, action, object_type, object_id, description)
      VALUES (?, ?, 'users', ?, ?)
    `,
    [actor?.user_id || null, action, objectId || null, description]
  );
};

const countActiveAdmins = async (connection) => {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      WHERE r.role_name IN ('ADMIN','MANAGER') AND u.status = 'ACTIVE'
    `
  );

  return Number(rows[0]?.total || 0);
};

const createUser = async (payload = {}, actor = null) => {
  const { errors, values } = await validateUserPayload(payload);

  if (Object.keys(errors).length) {
    return buildError(400, 'Thông tin tài khoản không hợp lệ', errors);
  }

  const duplicate = await ensureUniqueContact({ email: values.email, phone: values.phone });
  if (duplicate) {
    return buildError(409, 'Email hoặc số điện thoại đã được sử dụng', {
      contact: 'Thông tin liên hệ bị trùng'
    });
  }

  const passwordHash = await bcrypt.hash(values.password, 10);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `
        INSERT INTO users (role_id, full_name, email, phone, password_hash, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [values.role.role_id, values.fullName, values.email, values.phone, passwordHash, values.status]
    );

    await writeSystemLog(connection, actor, 'CREATE_USER', result.insertId, `Created internal user ${values.fullName} with role ${values.role.role_name}`);

    await connection.commit();

    return {
      ok: true,
      data: {
        user_id: Number(result.insertId)
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getUserForUpdate = async (connection, userId) => {
  const [users] = await connection.query(
    `
      SELECT u.*, r.role_name
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      WHERE u.user_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [userId]
  );

  return users[0] || null;
};

const updateUser = async (userId, payload = {}, actor = null) => {
  const normalizedUserId = Number.parseInt(userId, 10);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    return buildError(400, 'Tài khoản không hợp lệ', { user_id: 'ID tài khoản không hợp lệ' });
  }

  const { errors, values } = await validateUserPayload(payload, { partial: true });
  if (Object.keys(errors).length) {
    return buildError(400, 'Thông tin tài khoản không hợp lệ', errors);
  }

  const duplicate = await ensureUniqueContact({
    email: Object.prototype.hasOwnProperty.call(payload, 'email') ? values.email : null,
    phone: Object.prototype.hasOwnProperty.call(payload, 'phone') ? values.phone : null,
    excludeUserId: normalizedUserId
  });

  if (duplicate) {
    return buildError(409, 'Email hoặc số điện thoại đã được sử dụng', {
      contact: 'Thông tin liên hệ bị trùng'
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const user = await getUserForUpdate(connection, normalizedUserId);
    if (!user) {
      await connection.rollback();
      return buildError(404, 'Không tìm thấy tài khoản');
    }

    const nextRole = values.role || { role_id: user.role_id, role_name: user.role_name };
    const nextStatus = Object.prototype.hasOwnProperty.call(payload, 'status') ? values.status : user.status;

    if (user.status === 'ACTIVE' && nextStatus !== 'ACTIVE' && ['ADMIN', 'MANAGER'].includes(user.role_name)) {
      const activeAdmins = await countActiveAdmins(connection);
      if (activeAdmins <= 1) {
        await connection.rollback();
        return buildError(409, 'Không thể khóa admin cuối cùng đang hoạt động');
      }
    }

    if (['ADMIN', 'MANAGER'].includes(user.role_name) && !['ADMIN', 'MANAGER'].includes(nextRole.role_name)) {
      const activeAdmins = await countActiveAdmins(connection);
      if (user.status === 'ACTIVE' && activeAdmins <= 1) {
        await connection.rollback();
        return buildError(409, 'Không thể gỡ vai trò quản trị của admin cuối cùng');
      }
    }

    const updates = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(payload, 'full_name')) {
      updates.push('full_name = ?');
      params.push(values.fullName);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
      updates.push('email = ?');
      params.push(values.email);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
      updates.push('phone = ?');
      params.push(values.phone);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'role_name')) {
      updates.push('role_id = ?');
      params.push(nextRole.role_id);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
      updates.push('status = ?');
      params.push(nextStatus);
    }

    if (String(payload.password || '')) {
      if (String(payload.password).length < 8) {
        await connection.rollback();
        return buildError(400, 'Mật khẩu tối thiểu 8 ký tự', { password: 'Mật khẩu tối thiểu 8 ký tự' });
      }
      updates.push('password_hash = ?');
      params.push(await bcrypt.hash(String(payload.password), 10));
    }

    if (!updates.length) {
      await connection.rollback();
      return buildError(400, 'Không có thông tin cần cập nhật');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(normalizedUserId);

    await connection.query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, params);
    await writeSystemLog(connection, actor, 'UPDATE_USER', normalizedUserId, `Updated user ${normalizedUserId}`);

    await connection.commit();

    return {
      ok: true,
      data: {
        user_id: normalizedUserId
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const setUserLock = async (userId, locked, actor = null) =>
  updateUser(
    userId,
    {
      status: locked ? 'LOCKED' : 'ACTIVE'
    },
    actor
  );

module.exports = {
  listUsers,
  createUser,
  updateUser,
  setUserLock
};
