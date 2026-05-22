const express = require('express');
const adminOrdersController = require('./admin-orders.controller');

const router = express.Router();

router.get('/', adminOrdersController.listAdminOrders);
router.get('/:id', adminOrdersController.getAdminOrderDetail);
router.patch('/:id/confirm', adminOrdersController.confirmAdminOrder);
router.patch('/:id/cancel', adminOrdersController.cancelAdminOrder);

module.exports = router;
