const pool = require('../../config/database');
const { ORDER_STATUS_FLOW, ORDER_STATUSES, getOrderStatusLabel } = require('../../common/orderStatus');
const { generateOrderCode } = require('../../utils/generateOrderCode');
const vouchersService = require('../vouchers/vouchers.service');

const PAYMENT_METHODS = new Set(['COD', 'ONLINE_MOCK']);
const PAID = 'PAID';
const COD = 'COD';

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
const toMoney = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.round(numberValue) : fallback;
};

const isValidEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPhone = (value) => !value || /^(0\d{9}|\+84\d{9})$/.test(value);

const normalizeSearchText = (value) =>
  normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const mapAddress = (address) => ({
  address_id: Number(address.address_id),
  user_id: Number(address.user_id),
  receiver_name: address.receiver_name,
  receiver_phone: address.receiver_phone,
  address_detail: address.address_detail,
  ward: address.ward,
  district: address.district,
  city: address.city,
  is_default: Boolean(address.is_default),
  created_at: address.created_at
});

const mapVoucher = (row) => ({
  user_voucher_id: row.user_voucher_id ? Number(row.user_voucher_id) : null,
  voucher_id: Number(row.voucher_id),
  voucher_code: row.voucher_code,
  voucher_name: row.voucher_name,
  discount_type: row.discount_type,
  discount_value: Number(row.discount_value || 0),
  min_order_amount: Number(row.min_order_amount || 0),
  max_discount_amount: row.max_discount_amount === null ? null : Number(row.max_discount_amount || 0),
  target_type: row.target_type,
  status: row.wallet_status || row.status,
  start_date: row.start_date,
  end_date: row.end_date
});

const getUser = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT u.user_id, r.role_name, u.full_name, u.email, u.phone, u.status, u.total_points, u.created_at, u.updated_at
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      WHERE u.user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

const ensureUniqueContact = async ({ email, phone, userId }) => {
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
    `SELECT user_id FROM users WHERE (${conditions.join(' OR ')}) AND user_id <> ? LIMIT 1`,
    [...params, userId]
  );

  return rows[0] || null;
};

const getProfile = async (userId) => {
  const user = await getUser(userId);
  if (!user) return buildError(404, 'Không tìm thấy tài khoản');

  return {
    ok: true,
    data: {
      user_id: Number(user.user_id),
      role_name: user.role_name,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      total_points: Number(user.total_points || 0),
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  };
};

const updateProfile = async (userId, payload = {}) => {
  const fullName = normalizeName(payload.full_name);
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  const errors = {};

  if (!fullName) errors.full_name = 'Vui lòng nhập họ tên';
  if (!email && !phone) errors.contact = 'Vui lòng nhập email hoặc số điện thoại';
  if (!isValidEmail(email)) errors.email = 'Email không đúng định dạng';
  if (!isValidPhone(phone)) errors.phone = 'Số điện thoại không đúng định dạng';

  if (Object.keys(errors).length) {
    return buildError(400, 'Thông tin hồ sơ không hợp lệ', errors);
  }

  const duplicate = await ensureUniqueContact({ email, phone, userId });
  if (duplicate) {
    return buildError(409, 'Email hoặc số điện thoại đã được sử dụng', {
      contact: 'Thông tin liên hệ bị trùng'
    });
  }

  await pool.query(
    `
      UPDATE users
      SET full_name = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `,
    [fullName, email || null, phone || null, userId]
  );

  return getProfile(userId);
};

const listAddresses = async (userId) => {
  const [addresses] = await pool.query(
    `
      SELECT *
      FROM addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC, address_id DESC
    `,
    [userId]
  );

  return {
    ok: true,
    data: addresses.map(mapAddress)
  };
};

const validateAddressPayload = (payload = {}, partial = false) => {
  const values = {
    receiver_name: normalizeName(payload.receiver_name),
    receiver_phone: normalizePhone(payload.receiver_phone),
    address_detail: normalizeText(payload.address_detail),
    ward: normalizeText(payload.ward) || null,
    district: normalizeText(payload.district) || null,
    city: normalizeText(payload.city) || null,
    is_default: Boolean(payload.is_default)
  };
  const errors = {};

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'receiver_name')) {
    if (!values.receiver_name) errors.receiver_name = 'Vui lòng nhập tên người nhận';
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'receiver_phone')) {
    if (!values.receiver_phone) errors.receiver_phone = 'Vui lòng nhập số điện thoại';
    else if (!isValidPhone(values.receiver_phone)) errors.receiver_phone = 'Số điện thoại không đúng định dạng';
  }

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'address_detail')) {
    if (!values.address_detail) errors.address_detail = 'Vui lòng nhập địa chỉ';
  }

  return { values, errors };
};

const createAddress = async (userId, payload = {}) => {
  const { values, errors } = validateAddressPayload(payload);
  if (Object.keys(errors).length) {
    return buildError(400, 'Thông tin địa chỉ không hợp lệ', errors);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (values.is_default) {
      await connection.query('UPDATE addresses SET is_default = FALSE WHERE user_id = ?', [userId]);
    }

    const [result] = await connection.query(
      `
        INSERT INTO addresses (user_id, receiver_name, receiver_phone, address_detail, ward, district, city, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [userId, values.receiver_name, values.receiver_phone, values.address_detail, values.ward, values.district, values.city, values.is_default]
    );

    const [rows] = await connection.query('SELECT * FROM addresses WHERE address_id = ? AND user_id = ? LIMIT 1', [
      result.insertId,
      userId
    ]);

    await connection.commit();
    return {
      ok: true,
      data: mapAddress(rows[0])
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateAddress = async (userId, addressId, payload = {}) => {
  const normalizedAddressId = Number.parseInt(addressId, 10);
  if (!Number.isInteger(normalizedAddressId) || normalizedAddressId <= 0) {
    return buildError(400, 'Địa chỉ không hợp lệ');
  }

  const { values, errors } = validateAddressPayload(payload, true);
  if (Object.keys(errors).length) {
    return buildError(400, 'Thông tin địa chỉ không hợp lệ', errors);
  }

  const updates = [];
  const params = [];
  ['receiver_name', 'receiver_phone', 'address_detail', 'ward', 'district', 'city', 'is_default'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      updates.push(`${field} = ?`);
      params.push(values[field]);
    }
  });

  if (!updates.length) return buildError(400, 'Không có thông tin cần cập nhật');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT * FROM addresses WHERE address_id = ? AND user_id = ? LIMIT 1 FOR UPDATE', [
      normalizedAddressId,
      userId
    ]);

    if (!existing.length) {
      await connection.rollback();
      return buildError(404, 'Không tìm thấy địa chỉ');
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'is_default') && values.is_default) {
      await connection.query('UPDATE addresses SET is_default = FALSE WHERE user_id = ?', [userId]);
    }

    params.push(normalizedAddressId, userId);
    await connection.query(`UPDATE addresses SET ${updates.join(', ')} WHERE address_id = ? AND user_id = ?`, params);

    const [rows] = await connection.query('SELECT * FROM addresses WHERE address_id = ? AND user_id = ? LIMIT 1', [
      normalizedAddressId,
      userId
    ]);

    await connection.commit();
    return {
      ok: true,
      data: mapAddress(rows[0])
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const deleteAddress = async (userId, addressId) => {
  const normalizedAddressId = Number.parseInt(addressId, 10);
  if (!Number.isInteger(normalizedAddressId) || normalizedAddressId <= 0) {
    return buildError(400, 'Địa chỉ không hợp lệ');
  }

  const [result] = await pool.query('DELETE FROM addresses WHERE address_id = ? AND user_id = ?', [normalizedAddressId, userId]);
  if (!result.affectedRows) return buildError(404, 'Không tìm thấy địa chỉ');

  return {
    ok: true,
    data: {
      deleted: true
    }
  };
};

const setDefaultAddress = async (userId, addressId) => {
  const normalizedAddressId = Number.parseInt(addressId, 10);
  if (!Number.isInteger(normalizedAddressId) || normalizedAddressId <= 0) {
    return buildError(400, 'Địa chỉ không hợp lệ');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT address_id FROM addresses WHERE address_id = ? AND user_id = ? LIMIT 1 FOR UPDATE', [
      normalizedAddressId,
      userId
    ]);
    if (!rows.length) {
      await connection.rollback();
      return buildError(404, 'Không tìm thấy địa chỉ');
    }

    await connection.query('UPDATE addresses SET is_default = FALSE WHERE user_id = ?', [userId]);
    await connection.query('UPDATE addresses SET is_default = TRUE WHERE address_id = ? AND user_id = ?', [normalizedAddressId, userId]);
    await connection.commit();

    return listAddresses(userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const listVouchers = async (userId) => {
  const [walletRows] = await pool.query(
    `
      SELECT uv.user_voucher_id, uv.status AS wallet_status, v.*
      FROM user_vouchers uv
      JOIN vouchers v ON v.voucher_id = uv.voucher_id
      WHERE uv.user_id = ?
      ORDER BY uv.status = 'AVAILABLE' DESC, v.end_date ASC
    `,
    [userId]
  );

  const [memberRows] = await pool.query(
    `
      SELECT NULL AS user_voucher_id, NULL AS wallet_status, v.*
      FROM vouchers v
      WHERE v.target_type = 'MEMBER'
        AND v.status = 'ACTIVE'
        AND NOW() BETWEEN v.start_date AND v.end_date
      ORDER BY v.end_date ASC
    `
  );

  return {
    ok: true,
    data: {
      wallet: walletRows.map(mapVoucher),
      member_available: memberRows.map(mapVoucher)
    }
  };
};

const applyVoucher = async (userId, payload = {}) => {
  const subtotal = toMoney(payload.orderTotal || payload.order_total || payload.subtotal);
  const code = normalizeText(payload.code || payload.voucher_code).toUpperCase();

  if (!code) return buildError(400, 'Vui lòng nhập mã voucher');
  if (subtotal <= 0) return buildError(400, 'Giá trị đơn hàng không hợp lệ');

  const publicResult = await vouchersService.applyPublicVoucher({ code, orderTotal: subtotal });
  if (publicResult.ok) return publicResult;

  const [rows] = await pool.query(
    `
      SELECT v.*, uv.user_voucher_id, uv.status AS wallet_status
      FROM vouchers v
      LEFT JOIN user_vouchers uv ON uv.voucher_id = v.voucher_id AND uv.user_id = ?
      WHERE v.voucher_code = ?
      LIMIT 1
    `,
    [userId, code]
  );

  const voucher = rows[0];
  if (!voucher) return buildError(404, 'Voucher không tồn tại');
  if (voucher.status !== 'ACTIVE' || new Date(voucher.start_date) > new Date() || new Date(voucher.end_date) < new Date()) {
    return buildError(400, 'Voucher không khả dụng');
  }
  if (voucher.target_type === 'PERSONAL' && voucher.wallet_status !== 'AVAILABLE') {
    return buildError(403, 'Voucher cá nhân không thuộc ví của tài khoản hoặc đã được sử dụng');
  }
  if (voucher.target_type !== 'MEMBER' && voucher.target_type !== 'PERSONAL') {
    return buildError(400, 'Voucher không hợp lệ cho đơn thành viên');
  }
  if (voucher.usage_limit !== null && Number(voucher.used_count || 0) >= Number(voucher.usage_limit)) {
    return buildError(400, 'Voucher đã hết lượt sử dụng');
  }
  if (subtotal < Number(voucher.min_order_amount || 0)) {
    return buildError(400, 'Đơn hàng chưa đạt giá trị tối thiểu của voucher');
  }

  const rawDiscount =
    voucher.discount_type === 'PERCENT' ? Math.floor((subtotal * Number(voucher.discount_value || 0)) / 100) : Number(voucher.discount_value || 0);
  const discountAmount = Math.min(rawDiscount, voucher.max_discount_amount === null ? rawDiscount : Number(voucher.max_discount_amount || 0), subtotal);

  return {
    ok: true,
    data: {
      voucher_id: Number(voucher.voucher_id),
      voucher_code: voucher.voucher_code,
      code: voucher.voucher_code,
      voucher_name: voucher.voucher_name,
      discount_amount: discountAmount,
      discount_type: voucher.discount_type,
      target_type: voucher.target_type,
      user_voucher_id: voucher.user_voucher_id ? Number(voucher.user_voucher_id) : null
    }
  };
};

const listPoints = async (userId) => {
  const [transactions] = await pool.query(
    `
      SELECT point_transaction_id, order_id, program_id, transaction_type, points, description, created_at
      FROM point_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC, point_transaction_id DESC
      LIMIT 50
    `,
    [userId]
  );

  const [programs] = await pool.query(
    `
      SELECT program_id, program_name, point_rate, min_order_amount, reward_type, required_points, reward_description, start_date, end_date, status
      FROM loyalty_programs
      WHERE status = 'ACTIVE' AND NOW() BETWEEN start_date AND end_date
      ORDER BY required_points ASC
      LIMIT 20
    `
  );

  const profile = await getProfile(userId);
  return {
    ok: true,
    data: {
      total_points: profile.data.total_points,
      transactions: transactions.map((row) => ({
        ...row,
        point_transaction_id: Number(row.point_transaction_id),
        order_id: row.order_id ? Number(row.order_id) : null,
        program_id: row.program_id ? Number(row.program_id) : null,
        points: Number(row.points || 0)
      })),
      programs: programs.map((row) => ({
        ...row,
        program_id: Number(row.program_id),
        point_rate: Number(row.point_rate || 0),
        min_order_amount: Number(row.min_order_amount || 0),
        required_points: Number(row.required_points || 0)
      }))
    }
  };
};

const validateDeliveryArea = async (address) => {
  const [areas] = await pool.query(
    `
      SELECT area_id, area_name, district, city, delivery_fee
      FROM delivery_areas
      WHERE is_active = TRUE
      ORDER BY delivery_fee ASC
    `
  );

  const normalizedAddress = normalizeSearchText(address);
  return (
    areas.find((area) => normalizedAddress.includes(normalizeSearchText(area.district)) && normalizedAddress.includes(normalizeSearchText(area.city))) ||
    areas.find((area) => normalizedAddress.includes(normalizeSearchText(area.district))) ||
    null
  );
};

const loadAndValidateItems = async (items = []) => {
  const errors = {};
  const normalizedItems = items.map((item, index) => ({
    index,
    food_id: Number(item.food_id),
    quantity: Number.parseInt(item.quantity, 10),
    note: normalizeText(item.note).slice(0, 255),
    selected_options: Array.isArray(item.selected_options) ? item.selected_options : []
  }));

  normalizedItems.forEach((item) => {
    if (!Number.isInteger(item.food_id) || item.food_id <= 0) errors[`items.${item.index}.food_id`] = 'Món ăn không hợp lệ';
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) errors[`items.${item.index}.quantity`] = 'Số lượng món phải lớn hơn 0';
  });

  if (Object.keys(errors).length) return { ok: false, errors };

  const foodIds = [...new Set(normalizedItems.map((item) => item.food_id))];
  const [foods] = await pool.query('SELECT food_id, food_name, price FROM foods WHERE food_id IN (?) AND status = ?', [foodIds, 'ACTIVE']);
  const foodMap = new Map(foods.map((food) => [Number(food.food_id), food]));

  normalizedItems.forEach((item) => {
    if (!foodMap.has(item.food_id)) errors[`items.${item.index}.food_id`] = 'Món ăn không tồn tại hoặc đã ngừng bán';
  });

  if (!Object.keys(errors).length) {
    const [inventoryRows] = await pool.query('SELECT food_id, quantity, is_unlimited FROM inventory WHERE food_id IN (?)', [foodIds]);
    const inventoryMap = new Map(inventoryRows.map((row) => [Number(row.food_id), row]));
    normalizedItems.forEach((item) => {
      const inventory = inventoryMap.get(item.food_id);
      if (inventory && !Boolean(inventory.is_unlimited) && Number(inventory.quantity || 0) < item.quantity) {
        errors[`items.${item.index}.quantity`] = 'Món ăn tạm hết hàng hoặc không đủ số lượng';
      }
    });
  }

  const optionIds = [
    ...new Set(
      normalizedItems.flatMap((item) =>
        item.selected_options.map((option) => Number(option.option_id)).filter((optionId) => Number.isInteger(optionId) && optionId > 0)
      )
    )
  ];
  const optionMap = new Map();

  if (optionIds.length) {
    const [options] = await pool.query('SELECT option_id, food_id, option_name, extra_price FROM food_options WHERE option_id IN (?) AND status = ?', [
      optionIds,
      'ACTIVE'
    ]);
    options.forEach((option) => optionMap.set(Number(option.option_id), option));
  }

  const orderItems = normalizedItems.map((item) => {
    const food = foodMap.get(item.food_id);
    const selectedOptions = item.selected_options.map((option) => {
      const optionId = Number(option.option_id);
      const optionRow = optionMap.get(optionId);

      if (!Number.isInteger(optionId) || optionId <= 0 || !optionRow || Number(optionRow.food_id) !== item.food_id) {
        errors[`items.${item.index}.selected_options`] = 'Tùy chọn món ăn không hợp lệ';
        return null;
      }

      return {
        option_name_snapshot: optionRow.option_name,
        quantity: Math.max(1, Number.parseInt(option.quantity, 10) || 1),
        extra_price: Number(optionRow.extra_price || 0)
      };
    });

    const optionTotal = selectedOptions.reduce((total, option) => total + (option ? Number(option.extra_price || 0) * Number(option.quantity || 1) : 0), 0);
    const unitPrice = Number(food?.price || 0) + optionTotal;
    return {
      food_id: item.food_id,
      food_name_snapshot: food?.food_name || '',
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: unitPrice * item.quantity,
      note: item.note,
      selected_options: selectedOptions.filter(Boolean)
    };
  });

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    orderItems,
    subtotal: orderItems.reduce((total, item) => total + Number(item.total_price || 0), 0)
  };
};

const getUniqueOrderCode = async (connection) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderCode = generateOrderCode();
    const [rows] = await connection.query('SELECT order_id FROM orders WHERE order_code = ? LIMIT 1', [orderCode]);
    if (!rows.length) return orderCode;
  }

  throw new Error('Không thể tạo mã đơn hàng duy nhất');
};

const resolveMemberVoucherDiscount = async ({ userId, appliedVoucher, requestedDiscount, subtotal }) => {
  if (!appliedVoucher || requestedDiscount <= 0) {
    return { discountAmount: 0, voucher: null, userVoucher: null };
  }

  const voucherCode = normalizeText(appliedVoucher.code || appliedVoucher.voucher_code).toUpperCase();
  const publicResult = await vouchersService.applyPublicVoucher({ code: voucherCode, orderTotal: subtotal });

  if (publicResult.ok) {
    const discountAmount = Number(publicResult.data.discount_amount || 0);
    if (discountAmount !== requestedDiscount) return { error: buildError(400, 'Giá trị giảm giá không khớp với voucher hiện tại') };
    return { discountAmount, voucher: publicResult.data, userVoucher: null };
  }

  const [rows] = await pool.query(
    `
      SELECT v.*, uv.user_voucher_id, uv.status AS wallet_status
      FROM vouchers v
      LEFT JOIN user_vouchers uv ON uv.voucher_id = v.voucher_id AND uv.user_id = ?
      WHERE v.voucher_code = ?
      LIMIT 1
    `,
    [userId, voucherCode]
  );

  const voucher = rows[0];
  if (!voucher) return { error: buildError(404, 'Voucher không tồn tại') };
  if (voucher.status !== 'ACTIVE' || new Date(voucher.start_date) > new Date() || new Date(voucher.end_date) < new Date()) {
    return { error: buildError(400, 'Voucher không khả dụng') };
  }
  if (voucher.target_type === 'PERSONAL' && voucher.wallet_status !== 'AVAILABLE') {
    return { error: buildError(403, 'Voucher cá nhân không thuộc ví của tài khoản hoặc đã được sử dụng') };
  }
  if (voucher.target_type !== 'MEMBER' && voucher.target_type !== 'PERSONAL') {
    return { error: buildError(400, 'Voucher không hợp lệ cho đơn thành viên') };
  }
  if (voucher.usage_limit !== null && Number(voucher.used_count || 0) >= Number(voucher.usage_limit)) {
    return { error: buildError(400, 'Voucher đã hết lượt sử dụng') };
  }
  if (subtotal < Number(voucher.min_order_amount || 0)) {
    return { error: buildError(400, 'Đơn hàng chưa đạt giá trị tối thiểu của voucher') };
  }

  const rawDiscount =
    voucher.discount_type === 'PERCENT' ? Math.floor((subtotal * Number(voucher.discount_value || 0)) / 100) : Number(voucher.discount_value || 0);
  const discountAmount = Math.min(rawDiscount, voucher.max_discount_amount === null ? rawDiscount : Number(voucher.max_discount_amount || 0), subtotal);

  if (discountAmount !== requestedDiscount) {
    return { error: buildError(400, 'Giá trị giảm giá không khớp với voucher hiện tại') };
  }

  return {
    discountAmount,
    voucher: {
      ...mapVoucher(voucher),
      discount_amount: discountAmount
    },
    userVoucher: voucher.user_voucher_id ? Number(voucher.user_voucher_id) : null
  };
};

const getDeliveryAddress = async (userId, payload = {}) => {
  if (payload.address_id) {
    const [rows] = await pool.query('SELECT * FROM addresses WHERE address_id = ? AND user_id = ? LIMIT 1', [payload.address_id, userId]);
    if (!rows.length) return { error: buildError(404, 'Không tìm thấy địa chỉ giao hàng') };
    const address = rows[0];
    return {
      address: `${address.address_detail}${address.ward ? `, ${address.ward}` : ''}${address.district ? `, ${address.district}` : ''}${address.city ? `, ${address.city}` : ''}`
    };
  }

  return {
    address: normalizeText(payload.delivery_address || payload.guest_address)
  };
};

const createMemberOrder = async (userId, payload = {}) => {
  const errors = {};
  if (!Array.isArray(payload.items) || payload.items.length === 0) errors.items = 'Giỏ hàng đang rỗng';
  if (!PAYMENT_METHODS.has(payload.payment_method)) errors.payment_method = 'Phương thức thanh toán không hợp lệ';

  const deliveryAddressResult = await getDeliveryAddress(userId, payload);
  if (deliveryAddressResult.error) return deliveryAddressResult.error;
  if (!deliveryAddressResult.address) errors.delivery_address = 'Vui lòng chọn hoặc nhập địa chỉ giao hàng';

  if (Object.keys(errors).length) return buildError(400, 'Thông tin đặt hàng không hợp lệ', errors);

  const itemResult = await loadAndValidateItems(payload.items);
  if (!itemResult.ok) return buildError(400, 'Giỏ hàng không hợp lệ', itemResult.errors);

  const deliveryArea = await validateDeliveryArea(deliveryAddressResult.address);
  if (!deliveryArea) {
    return buildError(400, 'Địa chỉ nằm ngoài khu vực phục vụ', {
      delivery_address: 'Hiện chưa hỗ trợ giao hàng tại địa chỉ này'
    });
  }

  const subtotal = Math.round(itemResult.subtotal);
  if (toMoney(payload.subtotal) !== subtotal) {
    return buildError(400, 'Tạm tính giỏ hàng đã thay đổi. Vui lòng quay lại giỏ hàng để cập nhật.');
  }

  const requestedDiscount = toMoney(payload.discount_amount);
  const voucherResult = await resolveMemberVoucherDiscount({
    userId,
    appliedVoucher: payload.applied_voucher,
    requestedDiscount,
    subtotal
  });
  if (voucherResult.error) return voucherResult.error;

  const deliveryFee = Math.round(Number(deliveryArea.delivery_fee || 0));
  const totalAmount = Math.max(0, subtotal - voucherResult.discountAmount + deliveryFee);
  const paymentStatus = payload.payment_method === 'ONLINE_MOCK' ? PAID : COD;
  const earnedPoints = Math.floor(totalAmount / 10000);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const orderCode = await getUniqueOrderCode(connection);
    const [orderResult] = await connection.query(
      `
        INSERT INTO orders (
          order_code, user_id, customer_type, delivery_address, subtotal, delivery_fee, discount_amount,
          total_amount, order_status, payment_status, payment_method, note
        )
        VALUES (?, ?, 'MEMBER', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderCode,
        userId,
        deliveryAddressResult.address,
        subtotal,
        deliveryFee,
        voucherResult.discountAmount,
        totalAmount,
        ORDER_STATUSES.PENDING,
        paymentStatus,
        payload.payment_method,
        normalizeText(payload.note).slice(0, 255) || null
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of itemResult.orderItems) {
      const [orderItemResult] = await connection.query(
        `
          INSERT INTO order_items (order_id, food_id, food_name_snapshot, quantity, unit_price, total_price, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [orderId, item.food_id, item.food_name_snapshot, item.quantity, item.unit_price, item.total_price, item.note || null]
      );

      for (const option of item.selected_options) {
        await connection.query(
          `
            INSERT INTO order_item_options (order_item_id, option_name_snapshot, quantity, extra_price)
            VALUES (?, ?, ?, ?)
          `,
          [orderItemResult.insertId, option.option_name_snapshot, option.quantity, option.extra_price]
        );
      }
    }

    if (voucherResult.voucher) {
      await connection.query('INSERT INTO order_vouchers (order_id, voucher_id, discount_amount) VALUES (?, ?, ?)', [
        orderId,
        voucherResult.voucher.voucher_id,
        voucherResult.discountAmount
      ]);
      await connection.query('UPDATE vouchers SET used_count = used_count + 1 WHERE voucher_id = ?', [voucherResult.voucher.voucher_id]);
      if (voucherResult.userVoucher) {
        await connection.query("UPDATE user_vouchers SET status = 'USED', used_at = CURRENT_TIMESTAMP WHERE user_voucher_id = ?", [
          voucherResult.userVoucher
        ]);
      }
    }

    await connection.query(
      `
        INSERT INTO payments (order_id, payment_method, provider, transaction_code, amount, payment_status, paid_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderId,
        payload.payment_method === 'ONLINE_MOCK' ? 'ONLINE' : 'COD',
        payload.payment_method === 'ONLINE_MOCK' ? 'ONLINE_MOCK' : null,
        payload.payment_method === 'ONLINE_MOCK' ? `MOCK-${orderCode}` : null,
        totalAmount,
        payload.payment_method === 'ONLINE_MOCK' ? 'SUCCESS' : 'PENDING',
        payload.payment_method === 'ONLINE_MOCK' ? new Date() : null
      ]
    );

    await connection.query(
      'INSERT INTO order_status_logs (order_id, old_status, new_status, changed_by, note) VALUES (?, NULL, ?, ?, ?)',
      [orderId, ORDER_STATUSES.PENDING, userId, 'Member order created']
    );

    if (earnedPoints > 0) {
      await connection.query('UPDATE users SET total_points = total_points + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [earnedPoints, userId]);
      await connection.query(
        `
          INSERT INTO point_transactions (user_id, order_id, transaction_type, points, description)
          VALUES (?, ?, 'EARN', ?, ?)
        `,
        [userId, orderId, earnedPoints, `Tich diem tu don ${orderCode}`]
      );
    }

    await connection.query(
      `
        INSERT INTO notifications (user_id, order_id, channel, receiver, title, content, send_status)
        SELECT u.user_id, ?, CASE WHEN u.email IS NOT NULL THEN 'EMAIL' ELSE 'SMS' END, COALESCE(u.email, u.phone),
               'Đơn hàng đã được tạo', ?, 'PENDING'
        FROM users u WHERE u.user_id = ?
      `,
      [orderId, `Đơn hàng ${orderCode} đã được tạo thành công.`, userId]
    );

    await connection.commit();

    return {
      ok: true,
      data: {
        order_id: Number(orderId),
        order_code: orderCode,
        order_status: ORDER_STATUSES.PENDING,
        payment_method: payload.payment_method,
        payment_status: paymentStatus,
        total_amount: totalAmount,
        earned_points: earnedPoints
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const mapOrderSummary = (order) => ({
  order_id: Number(order.order_id),
  order_code: order.order_code,
  delivery_address: order.delivery_address,
  total_amount: Number(order.total_amount || 0),
  discount_amount: Number(order.discount_amount || 0),
  order_status: order.order_status,
  payment_status: order.payment_status,
  payment_method: order.payment_method,
  created_at: order.created_at,
  updated_at: order.updated_at
});

const listOrders = async (userId) => {
  const [orders] = await pool.query(
    `
      SELECT order_id, order_code, delivery_address, discount_amount, total_amount, order_status, payment_status, payment_method, created_at, updated_at
      FROM orders
      WHERE user_id = ? AND customer_type = 'MEMBER'
      ORDER BY created_at DESC, order_id DESC
      LIMIT 100
    `,
    [userId]
  );

  return {
    ok: true,
    data: orders.map(mapOrderSummary)
  };
};

const loadOrderItems = async (orderId) => {
  const [items] = await pool.query(
    `
      SELECT order_item_id, food_id, food_name_snapshot, quantity, unit_price, total_price, note
      FROM order_items
      WHERE order_id = ?
      ORDER BY order_item_id ASC
    `,
    [orderId]
  );

  const itemIds = items.map((item) => item.order_item_id);
  const optionsByItemId = new Map();

  if (itemIds.length) {
    const [options] = await pool.query(
      `
        SELECT order_item_id, option_name_snapshot, quantity, extra_price
        FROM order_item_options
        WHERE order_item_id IN (?)
        ORDER BY order_item_option_id ASC
      `,
      [itemIds]
    );
    options.forEach((option) => {
      const current = optionsByItemId.get(option.order_item_id) || [];
      current.push({
        option_name: option.option_name_snapshot,
        quantity: Number(option.quantity || 1),
        extra_price: Number(option.extra_price || 0)
      });
      optionsByItemId.set(option.order_item_id, current);
    });
  }

  return items.map((item) => ({
    order_item_id: Number(item.order_item_id),
    food_id: Number(item.food_id),
    food_name: item.food_name_snapshot,
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    total_price: Number(item.total_price || 0),
    note: item.note,
    options: optionsByItemId.get(item.order_item_id) || []
  }));
};

const buildStatusHistory = async (order) => {
  const [logs] = await pool.query(
    `
      SELECT old_status, new_status, note, created_at
      FROM order_status_logs
      WHERE order_id = ?
      ORDER BY created_at ASC, log_id ASC
    `,
    [order.order_id]
  );

  if (logs.length) {
    return logs.map((log) => ({
      status: log.new_status,
      label: getOrderStatusLabel(log.new_status),
      note: log.note,
      updated_at: log.created_at,
      is_current: log.new_status === order.order_status
    }));
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.order_status);
  const fallbackFlow = currentIndex >= 0 ? ORDER_STATUS_FLOW.slice(0, currentIndex + 1) : [order.order_status];
  return fallbackFlow.map((status) => ({
    status,
    label: getOrderStatusLabel(status),
    note: null,
    updated_at: status === order.order_status ? order.updated_at || order.created_at : null,
    is_current: status === order.order_status
  }));
};

const getOrderDetail = async (userId, idOrCode) => {
  const value = normalizeText(idOrCode);
  const numericId = Number.parseInt(value, 10);
  const clause = Number.isInteger(numericId) && String(numericId) === value ? 'order_id = ?' : 'order_code = ?';
  const [orders] = await pool.query(
    `
      SELECT *
      FROM orders
      WHERE ${clause} AND user_id = ? AND customer_type = 'MEMBER'
      LIMIT 1
    `,
    [clause === 'order_id = ?' ? numericId : value.toUpperCase(), userId]
  );

  if (!orders.length) return buildError(404, 'Không tìm thấy đơn hàng');
  const order = orders[0];
  const items = await loadOrderItems(order.order_id);
  const statusHistory = await buildStatusHistory(order);
  const cancelLog = [...statusHistory].reverse().find((entry) => entry.status === ORDER_STATUSES.CANCELLED && entry.note);

  return {
    ok: true,
    data: {
      ...mapOrderSummary(order),
      subtotal: Number(order.subtotal || 0),
      delivery_fee: Number(order.delivery_fee || 0),
      note: order.note,
      items,
      status_history: statusHistory,
      cancel_reason: order.order_status === ORDER_STATUSES.CANCELLED ? cancelLog?.note || null : null
    }
  };
};

const cancelMemberOrder = async (userId, idOrCode, payload = {}) => {
  const reason = normalizeText(payload.cancel_reason);
  if (!reason) return buildError(400, 'Vui lòng nhập lý do hủy đơn', { cancel_reason: 'Lý do hủy là bắt buộc' });

  const detail = await getOrderDetail(userId, idOrCode);
  if (!detail.ok) return detail;
  if (detail.data.order_status !== ORDER_STATUSES.PENDING) {
    return buildError(409, 'Chỉ có thể hủy đơn khi đơn đang ở trạng thái PENDING');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.query('SELECT * FROM orders WHERE order_id = ? AND user_id = ? LIMIT 1 FOR UPDATE', [detail.data.order_id, userId]);
    const order = orders[0];
    const nextPaymentStatus = order.payment_status === PAID ? 'REFUNDED' : order.payment_status;

    await connection.query('UPDATE orders SET order_status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?', [
      ORDER_STATUSES.CANCELLED,
      nextPaymentStatus,
      order.order_id
    ]);
    await connection.query('INSERT INTO order_status_logs (order_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?)', [
      order.order_id,
      order.order_status,
      ORDER_STATUSES.CANCELLED,
      userId,
      reason.slice(0, 255)
    ]);

    await connection.commit();
    return {
      ok: true,
      data: {
        order_id: Number(order.order_id),
        order_code: order.order_code,
        order_status: ORDER_STATUSES.CANCELLED,
        payment_status: nextPaymentStatus,
        cancel_reason: reason
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const reorder = async (userId, idOrCode) => {
  const detail = await getOrderDetail(userId, idOrCode);
  if (!detail.ok) return detail;

  return {
    ok: true,
    data: {
      source_order_code: detail.data.order_code,
      items: detail.data.items.map((item) => ({
        food_id: item.food_id,
        food_name: item.food_name,
        quantity: item.quantity,
        note: item.note,
        unit_price: item.unit_price,
        options: item.options
      }))
    }
  };
};

const createReview = async (userId, orderIdOrCode, payload = {}) => {
  const detail = await getOrderDetail(userId, orderIdOrCode);
  if (!detail.ok) return detail;

  if (detail.data.order_status !== ORDER_STATUSES.COMPLETED) {
    return buildError(409, 'Chỉ có thể đánh giá đơn đã hoàn thành');
  }

  const foodId = Number(payload.food_id);
  const rating = Number.parseInt(payload.rating, 10);
  const comment = normalizeText(payload.comment).slice(0, 1000) || null;
  const imageUrl = normalizeText(payload.image_url).slice(0, 255) || null;
  const errors = {};

  if (!detail.data.items.some((item) => item.food_id === foodId)) errors.food_id = 'Món ăn không thuộc đơn hàng này';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = 'Điểm đánh giá từ 1 đến 5';

  if (Object.keys(errors).length) return buildError(400, 'Thông tin đánh giá không hợp lệ', errors);

  const [existing] = await pool.query('SELECT review_id FROM reviews WHERE user_id = ? AND order_id = ? AND food_id = ? LIMIT 1', [
    userId,
    detail.data.order_id,
    foodId
  ]);
  if (existing.length) return buildError(409, 'Bạn đã đánh giá món này trong đơn hàng');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `
        INSERT INTO reviews (user_id, order_id, food_id, rating, comment, image_url, status)
        VALUES (?, ?, ?, ?, ?, ?, 'APPROVED')
      `,
      [userId, detail.data.order_id, foodId, rating, comment, imageUrl]
    );

    await connection.query(
      `
        UPDATE foods f
        SET average_rating = (
          SELECT ROUND(AVG(rating), 2)
          FROM reviews r
          WHERE r.food_id = f.food_id AND r.status = 'APPROVED'
        )
        WHERE f.food_id = ?
      `,
      [foodId]
    );

    await connection.commit();
    return {
      ok: true,
      data: {
        review_id: Number(result.insertId),
        status: 'APPROVED'
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getProfile,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  listVouchers,
  applyVoucher,
  listPoints,
  createMemberOrder,
  listOrders,
  getOrderDetail,
  cancelMemberOrder,
  reorder,
  createReview
};
