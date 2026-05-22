const { successResponse, errorResponse } = require('../../common/response.helper');
const vouchersService = require('./vouchers.service');

const applyPublicVoucher = async (req, res, next) => {
  try {
    const result = await vouchersService.applyPublicVoucher({
      code: req.body.code,
      orderTotal: req.body.orderTotal
    });

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode);
    }

    return successResponse(res, 'Ap dung voucher thanh cong', result.data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  applyPublicVoucher
};
