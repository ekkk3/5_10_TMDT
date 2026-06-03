const express = require('express');
const authController = require('./auth.controller');

const router = express.Router();

router.post('/login', authController.login);
router.post('/login/request-otp', authController.requestLoginOtp);
router.post('/login/verify-otp', authController.verifyLoginOtp);
router.post('/admin/login', authController.loginAdmin);
router.post('/admin/login/request-otp', authController.requestAdminLoginOtp);
router.post('/admin/login/verify-otp', authController.verifyAdminLoginOtp);
router.get('/admin/me', authController.getCurrentAdminUser);
router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);
router.post('/register', authController.requestRegistration);
router.post('/register/resend-otp', authController.resendRegistrationOtp);
router.post('/register/verify', authController.verifyRegistration);
router.post('/password/forgot', authController.requestPasswordReset);
router.post('/password/reset', authController.resetPassword);

module.exports = router;
