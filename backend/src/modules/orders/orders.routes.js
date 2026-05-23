const express = require('express');
const ordersController = require('./orders.controller');

const router = express.Router();

router.get('/tracking', ordersController.getGuestOrderTracking);
router.post('/guest', ordersController.createGuestOrder);
router.patch('/guest/:orderCode/cancel', ordersController.cancelGuestOrder);

module.exports = router;
