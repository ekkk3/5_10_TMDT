const express = require('express');
const kitchenController = require('./kitchen.controller');

const router = express.Router();

router.get('/orders', kitchenController.getPendingOrders);
router.patch('/orders/:id/cooking', kitchenController.markCooking);
router.patch('/orders/:id/ready', kitchenController.markReady);

module.exports = router;
