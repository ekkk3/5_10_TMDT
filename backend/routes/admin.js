const express = require('express');
const {
  getCategories,
  getProducts,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
  getAdminOrders,
  confirmOrder,
  cancelOrder
} = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/categories', getCategories);
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.patch('/products/:id/status', toggleProductStatus);
router.delete('/products/:id', deleteProduct);

router.get('/orders', getAdminOrders);
router.patch('/orders/:id/confirm', confirmOrder);
router.patch('/orders/:id/cancel', cancelOrder);

module.exports = router;
