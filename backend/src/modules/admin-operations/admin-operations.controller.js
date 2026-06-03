const { successResponse, errorResponse } = require('../../common/response.helper');
const service = require('./admin-operations.service');

const handleResult = (res, result, message, statusCode = 200) => {
  if (!result.ok) {
    return errorResponse(res, result.message, result.statusCode, result.errors || null);
  }

  return successResponse(res, message, result.data, statusCode);
};

const reportSummary = async (req, res, next) => {
  try {
    return handleResult(res, await service.getReportSummary(req.query), 'Lấy báo cáo thành công');
  } catch (error) {
    return next(error);
  }
};

const catalog = async (req, res, next) => {
  try {
    return handleResult(res, await service.listCatalog(), 'Lấy danh mục và món ăn thành công');
  } catch (error) {
    return next(error);
  }
};

const saveCategory = async (req, res, next) => {
  try {
    return handleResult(res, await service.saveCategory(req.body), 'Lưu danh mục thành công', 201);
  } catch (error) {
    return next(error);
  }
};

const saveFood = async (req, res, next) => {
  try {
    return handleResult(res, await service.saveFood(req.body), 'Lưu món ăn thành công', 201);
  } catch (error) {
    return next(error);
  }
};

const marketing = async (req, res, next) => {
  try {
    return handleResult(res, await service.listMarketing(), 'Lấy dữ liệu marketing thành công');
  } catch (error) {
    return next(error);
  }
};

const saveVoucher = async (req, res, next) => {
  try {
    return handleResult(res, await service.saveVoucher(req.body), 'Lưu voucher thành công', 201);
  } catch (error) {
    return next(error);
  }
};

const saveCampaign = async (req, res, next) => {
  try {
    return handleResult(res, await service.saveCampaign(req.body, req.user || null), 'Tạo chiến dịch thành công', 201);
  } catch (error) {
    return next(error);
  }
};

const loyalty = async (req, res, next) => {
  try {
    return handleResult(res, await service.listLoyaltyPrograms(), 'Lấy chương trình điểm thưởng thành công');
  } catch (error) {
    return next(error);
  }
};

const saveLoyaltyProgram = async (req, res, next) => {
  try {
    return handleResult(res, await service.saveLoyaltyProgram(req.body, req.user || null), 'Tạo chương trình điểm thưởng thành công', 201);
  } catch (error) {
    return next(error);
  }
};

const fulfillment = async (req, res, next) => {
  try {
    return handleResult(res, await service.listFulfillment(), 'Lấy dữ liệu giao vận và đối soát thành công');
  } catch (error) {
    return next(error);
  }
};

const createDeliveryOrder = async (req, res, next) => {
  try {
    return handleResult(res, await service.createDeliveryOrder(req.body), 'Tạo lệnh giao vận thành công', 201);
  } catch (error) {
    return next(error);
  }
};

const createReconciliation = async (req, res, next) => {
  try {
    return handleResult(res, await service.createReconciliation(req.body, req.user || null), 'Tạo phiên đối soát thành công', 201);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  reportSummary,
  catalog,
  saveCategory,
  saveFood,
  marketing,
  saveVoucher,
  saveCampaign,
  loyalty,
  saveLoyaltyProgram,
  fulfillment,
  createDeliveryOrder,
  createReconciliation
};
