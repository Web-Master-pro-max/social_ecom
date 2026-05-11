const express = require('express');
const { protect, sellerOnly, sellerOrAdmin } = require('../middleware/auth');
const {
  createOrder,
  verifyPayment,
  getMyOrders,
  getSellerOrders,
  getOrderById,
  updateOrderStatus
} = require('../controllers/orderController');

const router = express.Router();

router.post('/', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/my-orders', protect, getMyOrders);
router.get('/seller-orders', protect, sellerOnly, getSellerOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, sellerOrAdmin, updateOrderStatus);

module.exports = router;