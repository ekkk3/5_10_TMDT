const { successResponse, errorResponse } = require('../../common/response.helper');
const kitchenService = require('./kitchen.service');

const getPendingOrders = async (req, res, next) => {
  try {
    const result = await kitchenService.getPendingOrders(req.query);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Lay danh sach KDS thanh cong', result.data);
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

    return successResponse(res, 'Bep da bat dau nau don', result.data);
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

    return successResponse(res, 'Don da nau xong va cho giao', result.data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPendingOrders,
  markCooking,
  markReady
};
