const express = require('express');
const adminUsersController = require('./admin-users.controller');
const { requireAdminAuth, requirePermission } = require('../../middlewares/admin-auth.middleware');

const router = express.Router();

router.use(requireAdminAuth, requirePermission('USER_MANAGE'));
router.get('/', adminUsersController.listUsers);
router.post('/', adminUsersController.createUser);
router.patch('/:id', adminUsersController.updateUser);
router.patch('/:id/lock', adminUsersController.lockUser);
router.patch('/:id/unlock', adminUsersController.unlockUser);

module.exports = router;
