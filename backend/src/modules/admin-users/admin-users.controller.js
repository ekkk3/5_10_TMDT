const { successResponse, errorResponse } = require('../../common/response.helper');
const adminUsersService = require('./admin-users.service');

const listUsers = async (req, res, next) => {
  try {
    const result = await adminUsersService.listUsers(req.query);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Lay danh sach tai khoan thanh cong', result.data);
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const result = await adminUsersService.createUser(req.body, req.user || null);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Tao tai khoan nhan vien thanh cong', result.data, 201);
  } catch (error) {
    return next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const result = await adminUsersService.updateUser(req.params.id, req.body, req.user || null);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Cap nhat tai khoan thanh cong', result.data);
  } catch (error) {
    return next(error);
  }
};

const lockUser = async (req, res, next) => {
  try {
    const result = await adminUsersService.setUserLock(req.params.id, true, req.user || null);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Khoa tai khoan thanh cong', result.data);
  } catch (error) {
    return next(error);
  }
};

const unlockUser = async (req, res, next) => {
  try {
    const result = await adminUsersService.setUserLock(req.params.id, false, req.user || null);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Mo khoa tai khoan thanh cong', result.data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  lockUser,
  unlockUser
};
