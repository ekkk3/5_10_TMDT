const { successResponse, errorResponse } = require('../../common/response.helper');
const menuService = require('./menu.service');


const parsePositiveNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }


  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
};


const getCategories = async (req, res, next) => {
  try {
    const categories = await menuService.getCategories();
    return successResponse(res, 'Lay danh sach danh muc thanh cong', categories);
  } catch (error) {
    return next(error);
  }
};


const getFoods = async (req, res, next) => {
  try {
    const minPrice = parsePositiveNumber(req.query.minPrice);
    const maxPrice = parsePositiveNumber(req.query.maxPrice);


    if (minPrice === null || maxPrice === null) {
      return errorResponse(res, 'Gia loc khong hop le', 400);
    }


    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return errorResponse(res, 'Gia toi thieu khong duoc lon hon gia toi da', 400);
    }


    const foods = await menuService.getFoods({
      keyword: req.query.keyword,
      categoryId: req.query.categoryId,
      minPrice,
      maxPrice
    });


    return successResponse(res, 'Lay danh sach mon an thanh cong', foods);
  } catch (error) {
    return next(error);
  }
};


const getFoodById = async (req, res, next) => {
  try {
    const food = await menuService.getFoodById(req.params.id);


    if (!food) {
      return errorResponse(res, 'Khong tim thay mon an', 404);
    }


    return successResponse(res, 'Lay chi tiet mon an thanh cong', food);
  } catch (error) {
    return next(error);
  }
};


module.exports = {
  getCategories,
  getFoods,
  getFoodById
};

