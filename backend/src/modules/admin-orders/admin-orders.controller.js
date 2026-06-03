const { successResponse, errorResponse } = require('../../common/response.helper');
const adminOrdersService = require('./admin-orders.service');

const listAdminOrders = async (req, res, next) => {
  try {
    const result = await adminOrdersService.listAdminOrders(req.query);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Lấy danh sách đơn hàng thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

const getAdminOrderDetail = async (req, res, next) => {
  try {
    const result = await adminOrdersService.getAdminOrderDetail(req.params.id);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Lấy chi tiết đơn hàng thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

const confirmAdminOrder = async (req, res, next) => {
  try {
    const result = await adminOrdersService.confirmAdminOrder(req.params.id, req.user || null);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Xác nhận đơn hàng thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

const cancelAdminOrder = async (req, res, next) => {
  try {
    const result = await adminOrdersService.cancelAdminOrder(req.params.id, req.body, req.user || null);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Hủy đơn hàng thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listAdminOrders,
  getAdminOrderDetail,
  confirmAdminOrder,
  cancelAdminOrder
};
