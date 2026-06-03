const express = require('express');
const controller = require('./admin-operations.controller');
const { requireAdminAuth, requirePermission } = require('../../middlewares/admin-auth.middleware');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/reports/summary', requirePermission('ADMIN_DASHBOARD'), controller.reportSummary);

router.get('/catalog', requirePermission('MARKETING_MANAGE'), controller.catalog);
router.post('/catalog/categories', requirePermission('MARKETING_MANAGE'), controller.saveCategory);
router.post('/catalog/foods', requirePermission('MARKETING_MANAGE'), controller.saveFood);

router.get('/marketing', requirePermission('MARKETING_MANAGE'), controller.marketing);
router.post('/marketing/vouchers', requirePermission('MARKETING_MANAGE'), controller.saveVoucher);
router.post('/marketing/campaigns', requirePermission('MARKETING_MANAGE'), controller.saveCampaign);

router.get('/loyalty', requirePermission('MARKETING_MANAGE'), controller.loyalty);
router.post('/loyalty/programs', requirePermission('MARKETING_MANAGE'), controller.saveLoyaltyProgram);

router.get('/fulfillment', requirePermission('DELIVERY_MANAGE'), controller.fulfillment);
router.post('/fulfillment/deliveries', requirePermission('DELIVERY_MANAGE'), controller.createDeliveryOrder);
router.post('/fulfillment/reconciliations', requirePermission('DELIVERY_MANAGE'), controller.createReconciliation);

module.exports = router;
