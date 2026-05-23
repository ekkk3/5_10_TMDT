const express = require('express');
const adminOrdersController = require('./admin-orders.controller');
const { requireAdminAuth, requirePermission } = require('../../middlewares/admin-auth.middleware');

const router = express.Router();

router.use(requireAdminAuth, requirePermission('ORDER_MANAGE'));
router.get('/', adminOrdersController.listAdminOrders);
router.get('/:id', adminOrdersController.getAdminOrderDetail);
router.patch('/:id/confirm', adminOrdersController.confirmAdminOrder);
router.patch('/:id/cancel', adminOrdersController.cancelAdminOrder);

module.exports = router;
