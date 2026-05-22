const express = require('express');
const ordersController = require('./orders.controller');

const router = express.Router();

router.post('/guest', ordersController.createGuestOrder);

module.exports = router;
