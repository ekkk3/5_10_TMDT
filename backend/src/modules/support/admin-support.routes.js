const express = require('express');
const supportController = require('./support.controller');
const { requireAdminAuth, requirePermission } = require('../../middlewares/admin-auth.middleware');

const router = express.Router();

router.use(requireAdminAuth, requirePermission('CUSTOMER_SUPPORT'));
router.get('/tickets', supportController.listAdminTickets);
router.patch('/tickets/:id', supportController.updateAdminTicket);

module.exports = router;
