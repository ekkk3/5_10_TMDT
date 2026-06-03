const { successResponse, errorResponse } = require('../../common/response.helper');
const foodOptionsService = require('./food-options.service');

const getFoodOptionsByFoodId = async (req, res, next) => {
  try {
    const foodId = Number(req.params.foodId);

    if (!Number.isInteger(foodId) || foodId <= 0) {
      return errorResponse(res, 'Mã món ăn không hợp lệ', 400);
    }

    const optionGroups = await foodOptionsService.getFoodOptionsByFoodId(foodId);
    return successResponse(res, 'Lấy danh sách tùy chọn món ăn thành công', optionGroups);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getFoodOptionsByFoodId
};
