const express = require('express');
const accountController = require('./account.controller');
const { requireCustomerAuth } = require('../../middlewares/customer-auth.middleware');

const router = express.Router();

router.use(requireCustomerAuth);

router.get('/profile', accountController.getProfile);
router.patch('/profile', accountController.updateProfile);

router.get('/addresses', accountController.listAddresses);
router.post('/addresses', accountController.createAddress);
router.patch('/addresses/:id', accountController.updateAddress);
router.delete('/addresses/:id', accountController.deleteAddress);
router.patch('/addresses/:id/default', accountController.setDefaultAddress);

router.get('/vouchers', accountController.listVouchers);
router.post('/vouchers/apply', accountController.applyVoucher);
router.get('/points', accountController.listPoints);

router.get('/orders', accountController.listOrders);
router.post('/orders', accountController.createMemberOrder);
router.get('/orders/:id', accountController.getOrderDetail);
router.patch('/orders/:id/cancel', accountController.cancelMemberOrder);
router.post('/orders/:id/reorder', accountController.reorder);
router.post('/orders/:id/reviews', accountController.createReview);

module.exports = router;
