const express = require('express');
const {
  getKitchenOrders,
  startCooking,
  markReady
} = require('../controllers/kdsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken, requireRole('admin', 'kitchen'));

router.get('/orders', getKitchenOrders);
router.patch('/orders/:id/start', startCooking);
router.patch('/orders/:id/ready', markReady);

module.exports = router;
