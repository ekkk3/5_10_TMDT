const { successResponse, errorResponse } = require('../../common/response.helper');
const supportService = require('./support.service');

const handleResult = (res, result, message, statusCode = 200) => {
  if (!result.ok) {
    return errorResponse(res, result.message, result.statusCode, result.errors || null);
  }

  return successResponse(res, message, result.data, statusCode);
};

const createTicket = async (req, res, next) => {
  try {
    return handleResult(res, await supportService.createTicket(req.body, req.user || null), 'Tạo yêu cầu hỗ trợ thành công', 201);
  } catch (error) {
    return next(error);
  }
};

const getTicketByCode = async (req, res, next) => {
  try {
    return handleResult(res, await supportService.getTicketByCode(req.params.code, req.query), 'Lấy yêu cầu hỗ trợ thành công');
  } catch (error) {
    return next(error);
  }
};

const listMyTickets = async (req, res, next) => {
  try {
    return handleResult(res, await supportService.listMyTickets(req.user.user_id), 'Lấy danh sách yêu cầu hỗ trợ thành công');
  } catch (error) {
    return next(error);
  }
};

const listAdminTickets = async (req, res, next) => {
  try {
    return handleResult(res, await supportService.listAdminTickets(req.query), 'Lấy danh sách ticket thành công');
  } catch (error) {
    return next(error);
  }
};

const updateAdminTicket = async (req, res, next) => {
  try {
    return handleResult(res, await supportService.updateAdminTicket(req.params.id, req.body, req.user || null), 'Cập nhật ticket thành công');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createTicket,
  getTicketByCode,
  listMyTickets,
  listAdminTickets,
  updateAdminTicket
};
