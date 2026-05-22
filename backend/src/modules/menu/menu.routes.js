const express = require('express');
const menuController = require('./menu.controller');


const router = express.Router();


router.get('/categories', menuController.getCategories);
router.get('/foods', menuController.getFoods);
router.get('/foods/:id', menuController.getFoodById);


module.exports = router;