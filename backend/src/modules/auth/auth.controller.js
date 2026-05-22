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

    return successResponse(res, 'Dang nhap thanh cong', result.data);
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

    return successResponse(res, 'Da gui ma OTP dang nhap', result.data);
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

    return successResponse(res, 'Dang nhap thanh cong', result.data);
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

    return successResponse(res, 'Dang nhap quan tri thanh cong', result.data);
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

    return successResponse(res, 'Da gui ma OTP dang nhap quan tri', result.data);
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

    return successResponse(res, 'Dang nhap quan tri thanh cong', result.data);
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

    return successResponse(res, 'Lay phien dang nhap thanh cong', result.data);
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

    return successResponse(res, 'Lay phien quan tri thanh cong', result.data);
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const result = await authService.logout();

    return successResponse(res, 'Dang xuat thanh cong', result.data);
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

    return successResponse(res, 'Da gui ma xac thuc dang ky', result.data, 201);
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

    return successResponse(res, 'Da gui lai ma xac thuc', result.data);
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

    return successResponse(res, 'Dang ky tai khoan thanh cong', result.data, 201);
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
  verifyRegistration
};
