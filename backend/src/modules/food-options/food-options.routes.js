const express = require('express');
const foodOptionsController = require('./food-options.controller');

const router = express.Router();

router.get('/:foodId', foodOptionsController.getFoodOptionsByFoodId);

module.exports = router;
