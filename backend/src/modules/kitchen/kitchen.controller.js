const { successResponse, errorResponse } = require('../../common/response.helper');
const kitchenService = require('./kitchen.service');

const getPendingOrders = async (req, res, next) => {
  try {
    const result = await kitchenService.getPendingOrders(req.query);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Lấy danh sách KDS thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

const markCooking = async (req, res, next) => {
  try {
    const result = await kitchenService.markCooking(req.params.id, req.user || null);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Bếp đã bắt đầu nấu đơn', result.data);
  } catch (error) {
    return next(error);
  }
};

const markReady = async (req, res, next) => {
  try {
    const result = await kitchenService.markReady(req.params.id, req.user || null);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Đơn đã nấu xong va cho giao', result.data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPendingOrders,
  markCooking,
  markReady
};
