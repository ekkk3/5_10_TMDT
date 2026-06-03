const { successResponse, errorResponse } = require('../../common/response.helper');
const reportService = require('./report.service');

const getRevenueReport = async (req, res, next) => {
  try {
    const result = await reportService.getRevenueReport(req.query);

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Lấy báo cáo doanh thu thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getRevenueReport
};
