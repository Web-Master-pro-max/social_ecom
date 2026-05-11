const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const {
  getAdminStats,
  getAdminProducts,
  getAdminOrders,
  getAdminUsers,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  updateAdminOrderStatus,
  updateAdminUser,
  deleteAdminUser
} = require('../controllers/adminController');

const router = express.Router();

router.use(protect, adminOnly);
router.get('/stats', getAdminStats);
router.get('/products', getAdminProducts);
router.post('/products', createAdminProduct);
router.put('/products/:id', updateAdminProduct);
router.delete('/products/:id', deleteAdminProduct);
router.get('/orders', getAdminOrders);
router.patch('/orders/:id/status', updateAdminOrderStatus);
router.get('/users', getAdminUsers);
router.put('/users/:id', updateAdminUser);
router.delete('/users/:id', deleteAdminUser);

module.exports = router;
