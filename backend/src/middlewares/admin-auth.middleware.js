const { errorResponse } = require('../common/response.helper');
const authService = require('../modules/auth/auth.service');

const requireAdminAuth = async (req, res, next) => {
  try {
    const result = await authService.getCurrentAdminUser(req.headers.authorization);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    req.user = result.data.user;
    req.adminPermissions = result.data.permissions || [];
    return next();
  } catch (error) {
    return next(error);
  }
};

const requirePermission = (permission) => (req, res, next) => {
  if (!permission) {
    return next();
  }

  if (!req.adminPermissions?.includes(permission)) {
    return errorResponse(res, 'Tài khoản không đủ quyền thực hiện chức năng này', 403, {
      permission
    });
  }

  return next();
};

module.exports = {
  requireAdminAuth,
  requirePermission
};
