const { successResponse, errorResponse } = require('../../common/response.helper');
const dashboardService = require('./dashboard.service');

const getAdminDashboard = async (req, res, next) => {
  try {
    const result = await dashboardService.getAdminDashboard();

    if (!result.ok) {
      return errorResponse(res, result.message, result.statusCode, result.errors || null);
    }

    return successResponse(res, 'Lấy thống kê dashboard thành công', result.data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAdminDashboard
};
