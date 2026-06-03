const { errorResponse } = require('../common/response.helper');
const authService = require('../modules/auth/auth.service');

const requireCustomerAuth = async (req, res, next) => {
  try {
    const result = await authService.getCurrentUser(req.headers.authorization);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    req.user = result.data;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  requireCustomerAuth
};
