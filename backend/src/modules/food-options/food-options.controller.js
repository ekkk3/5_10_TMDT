const { successResponse, errorResponse } = require('../../common/response.helper');
const foodOptionsService = require('./food-options.service');

const getFoodOptionsByFoodId = async (req, res, next) => {
  try {
    const foodId = Number(req.params.foodId);

    if (!Number.isInteger(foodId) || foodId <= 0) {
      return errorResponse(res, 'Ma mon an khong hop le', 400);
    }

    const optionGroups = await foodOptionsService.getFoodOptionsByFoodId(foodId);
    return successResponse(res, 'Lay danh sach tuy chon mon an thanh cong', optionGroups);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getFoodOptionsByFoodId
};
