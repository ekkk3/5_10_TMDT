const express = require('express');
const vouchersController = require('./vouchers.controller');

const router = express.Router();

router.post('/apply-public', vouchersController.applyPublicVoucher);

module.exports = router;
