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

module.exports = {
  createGuestOrder
};
