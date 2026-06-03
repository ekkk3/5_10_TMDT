const express = require('express');
const reportController = require('./report.controller');
const { requireAdminAuth, requirePermission } = require('../../middlewares/admin-auth.middleware');

const router = express.Router();

router.use(requireAdminAuth, requirePermission('ADMIN_DASHBOARD'));
router.get('/revenue', reportController.getRevenueReport);

module.exports = router;
