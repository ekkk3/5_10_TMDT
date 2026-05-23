const express = require('express');
const kitchenController = require('./kitchen.controller');
const { requireAdminAuth, requirePermission } = require('../../middlewares/admin-auth.middleware');

const router = express.Router();

router.use(requireAdminAuth, requirePermission('KITCHEN_KDS'));
router.get('/orders', kitchenController.getPendingOrders);
router.patch('/orders/:id/cooking', kitchenController.markCooking);
router.patch('/orders/:id/ready', kitchenController.markReady);

module.exports = router;
