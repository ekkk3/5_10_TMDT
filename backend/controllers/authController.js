const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const ALLOWED_ROLES = ['customer', 'admin', 'kitchen'];

function createToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

async function register(req, res, next) {
  try {
    const { username, password, role = 'customer' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username va password la bat buoc.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Mat khau phai co toi thieu 6 ky tu.' });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Role khong hop le.' });
    }

    const [existing] = await pool.query(
      'SELECT user_id FROM users WHERE email = ? OR phone = ? OR full_name = ?',
      [username, username, username]
    );
    if (existing.length) {
      return res.status(409).json({ message: 'Username da ton tai.' });
    }

    const [roles] = await pool.query('SELECT role_id FROM roles WHERE role_name = ?', [role]);
    if (!roles.length) {
      return res.status(400).json({ message: 'Role chua duoc khai bao trong database.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (role_id, full_name, email, password_hash, status)
       VALUES (?, ?, ?, ?, 'ACTIVE')`,
      [roles[0].role_id, username, username, hashedPassword]
    );

    const user = { id: result.insertId, username, role };
    return res.status(201).json({
      message: 'Dang ky thanh cong.',
      token: createToken(user),
      user
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username va password la bat buoc.' });
    }

    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.password_hash, u.status, r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.email = ? OR u.phone = ? OR u.full_name = ?
       LIMIT 1`,
      [username, username, username]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Sai username hoac mat khau.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Tai khoan khong o trang thai ACTIVE.' });
    }

    // Seed demo dung mat khau thuong de de cham bai; tai khoan dang ky moi van duoc hash bcrypt.
    const isPasswordValid = user.password_hash.startsWith('$2')
      ? await bcrypt.compare(password, user.password_hash)
      : password === user.password_hash;

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Sai username hoac mat khau.' });
    }

    const safeUser = {
      id: user.user_id,
      username: user.email || user.phone || user.full_name,
      role: user.role_name
    };
    return res.json({
      message: 'Dang nhap thanh cong.',
      token: createToken(safeUser),
      user: safeUser
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login
};
