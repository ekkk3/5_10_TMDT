const { successResponse, errorResponse } = require('../../common/response.helper');
const ordersService = require('./orders.service');

const createGuestOrder = async (req, res, next) => {
  try {
    const result = await ordersService.createGuestOrder(req.body);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Tao don hang vang lai thanh cong', result.data, 201);
  } catch (error) {
    return next(error);
  }
};

const getGuestOrderTracking = async (req, res, next) => {
  try {
    const result = await ordersService.getGuestOrderTracking(req.query);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Tra cứu đơn hàng thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

const cancelGuestOrder = async (req, res, next) => {
  try {
    const result = await ordersService.cancelGuestOrder(req.params.orderCode, req.body);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Huy don hang vang lai thanh cong', result.data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createGuestOrder,
  getGuestOrderTracking,
  cancelGuestOrder
};
