const express = require('express');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getSellerProducts,
  getProductPosts,
  getProductReviews,
  createProductReview
} = require('../controllers/productController');

const router = express.Router();

router.route('/')
  .get(getProducts)
  .post(protect, upload.array('images', 9), createProduct);

router.get('/seller/:sellerId', getSellerProducts);
router.get('/:id/posts', getProductPosts);
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', protect, createProductReview);
router.route('/:id')
  .get(getProductById)
  .put(protect, upload.array('images', 9), updateProduct)
  .delete(protect, deleteProduct);

module.exports = router;