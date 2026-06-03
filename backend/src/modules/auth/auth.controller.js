const { successResponse, errorResponse } = require('../../common/response.helper');
const authService = require('./auth.service');

const login = async (req, res, next) => {
  try {
    const result = await authService.loginWithPassword({
      identifier: req.body.identifier,
      password: req.body.password
    });

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Đăng nhập thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

const requestLoginOtp = async (req, res, next) => {
  try {
    const result = await authService.requestLoginOtp({
      identifier: req.body.identifier
    });

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Đã gửi mã OTP đăng nhập', result.data);
  } catch (error) {
    return next(error);
  }
};

const verifyLoginOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyLoginOtp({
      verificationToken: req.body.verification_token,
      otp: req.body.otp
    });

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Đăng nhập thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

const loginAdmin = async (req, res, next) => {
  try {
    const result = await authService.loginAdminWithPassword({
      identifier: req.body.identifier,
      password: req.body.password
    });

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Đăng nhập quản trị thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

const requestAdminLoginOtp = async (req, res, next) => {
  try {
    const result = await authService.requestAdminLoginOtp({
      identifier: req.body.identifier
    });

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Đã gửi mã OTP đăng nhập quản trị', result.data);
  } catch (error) {
    return next(error);
  }
};

const verifyAdminLoginOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyAdminLoginOtp({
      verificationToken: req.body.verification_token,
      otp: req.body.otp
    });

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Đăng nhập quản trị thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const result = await authService.getCurrentUser(req.headers.authorization);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Lấy phiên đăng nhập thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

const getCurrentAdminUser = async (req, res, next) => {
  try {
    const result = await authService.getCurrentAdminUser(req.headers.authorization);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Lấy phiên quản trị thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const result = await authService.logout();

    return successResponse(res, 'Đăng xuất thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

const requestRegistration = async (req, res, next) => {
  try {
    const result = await authService.startRegistration(req.body);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Đã gửi mã xác thực đăng ký', result.data, 201);
  } catch (error) {
    return next(error);
  }
};

const resendRegistrationOtp = async (req, res, next) => {
  try {
    const result = await authService.resendRegistrationOtp({
      verificationToken: req.body.verification_token
    });

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Đã gửi lại mã xác thực', result.data);
  } catch (error) {
    return next(error);
  }
};

const verifyRegistration = async (req, res, next) => {
  try {
    const result = await authService.verifyRegistration({
      verificationToken: req.body.verification_token,
      otp: req.body.otp
    });

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Đăng ký tài khoản thành công', result.data, 201);
  } catch (error) {
    return next(error);
  }
};

const requestPasswordReset = async (req, res, next) => {
  try {
    const result = await authService.requestPasswordReset({
      identifier: req.body.identifier
    });

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Đã gửi mã OTP khôi phục mật khẩu', result.data);
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword({
      verificationToken: req.body.verification_token,
      otp: req.body.otp,
      password: req.body.password
    });

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Cập nhật mật khẩu thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  login,
  requestLoginOtp,
  verifyLoginOtp,
  loginAdmin,
  requestAdminLoginOtp,
  verifyAdminLoginOtp,
  getCurrentAdminUser,
  getCurrentUser,
  logout,
  requestRegistration,
  resendRegistrationOtp,
  verifyRegistration,
  requestPasswordReset,
  resetPassword
};
