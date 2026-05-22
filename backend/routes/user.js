const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Khai báo API GET /products
router.get('/products', userController.getMenu);
// Khai báo API POST /orders
router.post('/orders', userController.createOrder);

module.exports = router;