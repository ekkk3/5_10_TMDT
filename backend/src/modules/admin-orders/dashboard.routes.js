const express = require('express');
const dashboardController = require('./dashboard.controller');
const { requireAdminAuth, requirePermission } = require('../../middlewares/admin-auth.middleware');

const router = express.Router();

router.use(requireAdminAuth, requirePermission('ADMIN_DASHBOARD'));
router.get('/', dashboardController.getAdminDashboard);

module.exports = router;
