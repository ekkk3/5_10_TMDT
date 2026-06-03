const { successResponse, errorResponse } = require('../../common/response.helper');
const accountService = require('./account.service');

const handleResult = (res, result, message, statusCode = 200) => {
  if (!result.ok) {
    return errorResponse(res, result.message, result.statusCode, result.errors || null);
  }

  return successResponse(res, message, result.data, statusCode);
};

const getProfile = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.getProfile(req.user.user_id), 'Lấy hồ sơ thành công');
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.updateProfile(req.user.user_id, req.body), 'Cập nhật hồ sơ thành công');
  } catch (error) {
    return next(error);
  }
};

const listAddresses = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.listAddresses(req.user.user_id), 'Lấy sổ địa chỉ thành công');
  } catch (error) {
    return next(error);
  }
};

const createAddress = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.createAddress(req.user.user_id, req.body), 'Tạo địa chỉ thành công', 201);
  } catch (error) {
    return next(error);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.updateAddress(req.user.user_id, req.params.id, req.body), 'Cập nhật địa chỉ thành công');
  } catch (error) {
    return next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.deleteAddress(req.user.user_id, req.params.id), 'Xóa địa chỉ thành công');
  } catch (error) {
    return next(error);
  }
};

const setDefaultAddress = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.setDefaultAddress(req.user.user_id, req.params.id), 'Đặt địa chỉ mặc định thành công');
  } catch (error) {
    return next(error);
  }
};

const listVouchers = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.listVouchers(req.user.user_id), 'Lấy ví voucher thành công');
  } catch (error) {
    return next(error);
  }
};

const applyVoucher = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.applyVoucher(req.user.user_id, req.body), 'Áp dụng voucher thành công');
  } catch (error) {
    return next(error);
  }
};

const listPoints = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.listPoints(req.user.user_id), 'Lấy điểm thành viên thành công');
  } catch (error) {
    return next(error);
  }
};

const createMemberOrder = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.createMemberOrder(req.user.user_id, req.body), 'Tạo đơn hàng thành viên thành công', 201);
  } catch (error) {
    return next(error);
  }
};

const listOrders = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.listOrders(req.user.user_id), 'Lấy lịch sử đơn hàng thành công');
  } catch (error) {
    return next(error);
  }
};

const getOrderDetail = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.getOrderDetail(req.user.user_id, req.params.id), 'Lấy chi tiết đơn hàng thành công');
  } catch (error) {
    return next(error);
  }
};

const cancelMemberOrder = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.cancelMemberOrder(req.user.user_id, req.params.id, req.body), 'Hủy đơn hàng thành viên thành công');
  } catch (error) {
    return next(error);
  }
};

const reorder = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.reorder(req.user.user_id, req.params.id), 'Lấy dữ liệu đặt lại thành công');
  } catch (error) {
    return next(error);
  }
};

const createReview = async (req, res, next) => {
  try {
    return handleResult(res, await accountService.createReview(req.user.user_id, req.params.id, req.body), 'Gửi đánh giá thành công', 201);
  } catch (error) {
    return next(error);
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
