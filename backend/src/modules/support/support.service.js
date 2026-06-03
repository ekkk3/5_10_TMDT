const pool = require('../../config/database');

const TICKET_TYPES = new Set(['ORDER_SUPPORT', 'COMPLAINT', 'RETURN_REFUND', 'FEEDBACK', 'ACCOUNT_ERROR', 'OTHER']);
const TICKET_STATUSES = new Set(['NEW', 'RECEIVED', 'PROCESSING', 'WAITING_CUSTOMER', 'WAITING_APPROVAL', 'RESPONDED', 'COMPLETED', 'REJECTED', 'CLOSED']);

const buildError = (statusCode, message, errors = null) => ({
  ok: false,
  statusCode,
  message,
  errors
});

const normalizeText = (value) => String(value || '').trim();
const normalizePhone = (value) => normalizeText(value).replace(/[\s.-]/g, '');
const isValidPhone = (value) => !value || /^(0\d{9}|\+84\d{9})$/.test(value);

const getTicketCode = () => `TK${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const mapTicket = (ticket) => ({
  ticket_id: Number(ticket.ticket_id),
  ticket_code: ticket.ticket_code,
  user_id: ticket.user_id ? Number(ticket.user_id) : null,
  order_id: ticket.order_id ? Number(ticket.order_id) : null,
  guest_name: ticket.guest_name,
  guest_phone: ticket.guest_phone,
  ticket_type: ticket.ticket_type,
  title: ticket.title,
  content: ticket.content,
  evidence_url: ticket.evidence_url,
  assigned_to: ticket.assigned_to ? Number(ticket.assigned_to) : null,
  status: ticket.status,
  created_at: ticket.created_at,
  updated_at: ticket.updated_at
});

const resolveOrderId = async ({ orderCode, phone, userId }) => {
  const normalizedOrderCode = normalizeText(orderCode).toUpperCase();
  if (!normalizedOrderCode) return null;

  const params = [normalizedOrderCode];
  let sql = 'SELECT order_id, guest_phone, user_id FROM orders WHERE order_code = ?';

  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }

  sql += ' LIMIT 1';
  const [rows] = await pool.query(sql, params);
  const order = rows[0];

  if (!order) return null;
  if (!userId && phone && normalizePhone(order.guest_phone) !== normalizePhone(phone)) return null;
  return Number(order.order_id);
};

const createTicket = async (payload = {}, user = null) => {
  const ticketType = normalizeText(payload.ticket_type || 'OTHER').toUpperCase();
  const title = normalizeText(payload.title).slice(0, 150);
  const content = normalizeText(payload.content);
  const guestName = user ? null : normalizeText(payload.guest_name).slice(0, 100);
  const guestPhone = user ? null : normalizePhone(payload.guest_phone);
  const evidenceUrl = normalizeText(payload.evidence_url).slice(0, 255) || null;
  const errors = {};

  if (!TICKET_TYPES.has(ticketType)) errors.ticket_type = 'Loại yêu cầu không hợp lệ';
  if (!title) errors.title = 'Vui lòng nhập tiêu đề';
  if (!content) errors.content = 'Vui lòng nhập nội dung';
  if (!user && !guestName) errors.guest_name = 'Vui lòng nhập tên khách';
  if (!user && !guestPhone) errors.guest_phone = 'Vui lòng nhập số điện thoại';
  if (!isValidPhone(guestPhone)) errors.guest_phone = 'Số điện thoại không đúng định dạng';

  if (Object.keys(errors).length) {
    return buildError(400, 'Thông tin yêu cầu hỗ trợ không hợp lệ', errors);
  }

  const orderId = await resolveOrderId({
    orderCode: payload.order_code,
    phone: guestPhone,
    userId: user?.user_id
  });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const ticketCode = getTicketCode();
    const [result] = await connection.query(
      `
        INSERT INTO support_tickets (
          ticket_code, user_id, order_id, guest_name, guest_phone, ticket_type, title, content, evidence_url, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW')
      `,
      [ticketCode, user?.user_id || null, orderId, guestName, guestPhone || null, ticketType, title, content, evidenceUrl]
    );

    await connection.query(
      `
        INSERT INTO ticket_messages (ticket_id, sender_id, sender_type, message_content, attachment_url)
        VALUES (?, ?, ?, ?, ?)
      `,
      [result.insertId, user?.user_id || null, 'CUSTOMER', content, evidenceUrl]
    );

    await connection.commit();

    return {
      ok: true,
      data: {
        ticket_id: Number(result.insertId),
        ticket_code: ticketCode,
        status: 'NEW'
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const loadMessages = async (ticketId) => {
  const [messages] = await pool.query(
    `
      SELECT message_id, ticket_id, sender_id, sender_type, message_content, attachment_url, created_at
      FROM ticket_messages
      WHERE ticket_id = ?
      ORDER BY created_at ASC, message_id ASC
    `,
    [ticketId]
  );

  return messages.map((message) => ({
    ...message,
    message_id: Number(message.message_id),
    ticket_id: Number(message.ticket_id),
    sender_id: message.sender_id ? Number(message.sender_id) : null
  }));
};

const getTicketByCode = async (ticketCode, query = {}) => {
  const normalizedCode = normalizeText(ticketCode).toUpperCase();
  const phone = normalizePhone(query.phone || query.guest_phone);
  const [rows] = await pool.query('SELECT * FROM support_tickets WHERE ticket_code = ? LIMIT 1', [normalizedCode]);

  if (!rows.length) return buildError(404, 'Không tìm thấy yêu cầu hỗ trợ');
  const ticket = rows[0];

  if (ticket.guest_phone && phone && normalizePhone(ticket.guest_phone) !== phone) {
    return buildError(403, 'Số điện thoại không khớp với yêu cầu hỗ trợ');
  }

  return {
    ok: true,
    data: {
      ...mapTicket(ticket),
      messages: await loadMessages(ticket.ticket_id)
    }
  };
};

const listMyTickets = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT *
      FROM support_tickets
      WHERE user_id = ?
      ORDER BY created_at DESC, ticket_id DESC
      LIMIT 100
    `,
    [userId]
  );

  return {
    ok: true,
    data: rows.map(mapTicket)
  };
};

const listAdminTickets = async (filters = {}) => {
  const where = [];
  const params = [];
  const status = normalizeText(filters.status).toUpperCase();
  const type = normalizeText(filters.ticketType || filters.ticket_type).toUpperCase();
  const keyword = normalizeText(filters.keyword);

  if (status) {
    if (!TICKET_STATUSES.has(status)) return buildError(400, 'Trạng thái ticket không hợp lệ');
    where.push('st.status = ?');
    params.push(status);
  }

  if (type) {
    if (!TICKET_TYPES.has(type)) return buildError(400, 'Loại ticket không hợp lệ');
    where.push('st.ticket_type = ?');
    params.push(type);
  }

  if (keyword) {
    const like = `%${keyword}%`;
    where.push('(st.ticket_code LIKE ? OR st.title LIKE ? OR st.guest_phone LIKE ? OR u.full_name LIKE ?)');
    params.push(like, like, like, like);
  }

  const [rows] = await pool.query(
    `
      SELECT st.*, u.full_name AS member_name
      FROM support_tickets st
      LEFT JOIN users u ON u.user_id = st.user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY st.created_at DESC, st.ticket_id DESC
      LIMIT 150
    `,
    params
  );

  return {
    ok: true,
    data: rows.map((row) => ({
      ...mapTicket(row),
      member_name: row.member_name || null
    }))
  };
};

const updateAdminTicket = async (ticketId, payload = {}, actor = null) => {
  const normalizedTicketId = Number.parseInt(ticketId, 10);
  const status = normalizeText(payload.status).toUpperCase();
  const assignedTo = payload.assigned_to === undefined || payload.assigned_to === '' ? undefined : Number.parseInt(payload.assigned_to, 10);
  const reply = normalizeText(payload.reply);
  const errors = {};

  if (!Number.isInteger(normalizedTicketId) || normalizedTicketId <= 0) errors.ticket_id = 'Ticket không hợp lệ';
  if (status && !TICKET_STATUSES.has(status)) errors.status = 'Trạng thái ticket không hợp lệ';
  if (assignedTo !== undefined && (!Number.isInteger(assignedTo) || assignedTo <= 0)) errors.assigned_to = 'Nhân viên phụ trách không hợp lệ';

  if (Object.keys(errors).length) return buildError(400, 'Thông tin cập nhật ticket không hợp lệ', errors);

  const updates = [];
  const params = [];
  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  if (assignedTo !== undefined) {
    updates.push('assigned_to = ?');
    params.push(assignedTo);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [tickets] = await connection.query('SELECT * FROM support_tickets WHERE ticket_id = ? LIMIT 1 FOR UPDATE', [normalizedTicketId]);
    if (!tickets.length) {
      await connection.rollback();
      return buildError(404, 'Không tìm thấy ticket');
    }

    if (updates.length) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(normalizedTicketId);
      await connection.query(`UPDATE support_tickets SET ${updates.join(', ')} WHERE ticket_id = ?`, params);
    }

    if (reply) {
      await connection.query(
        `
          INSERT INTO ticket_messages (ticket_id, sender_id, sender_type, message_content)
          VALUES (?, ?, 'CSKH', ?)
        `,
        [normalizedTicketId, actor?.user_id || null, reply]
      );
      await connection.query("UPDATE support_tickets SET status = 'RESPONDED', updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?", [normalizedTicketId]);
    }

    await connection.commit();

    return getTicketByCode(tickets[0].ticket_code);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  createTicket,
  getTicketByCode,
  listMyTickets,
  listAdminTickets,
  updateAdminTicket
};
