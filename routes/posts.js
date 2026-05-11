const express = require('express');
const { protect, sellerOnly } = require('../middleware/auth');
const {
  createPost,
  getFeed,
  getPostById,
  deletePost,
  sharePost
} = require('../controllers/postController');

const router = express.Router();

router.route('/')
  .get(protect, getFeed)
  .post(protect, sellerOnly, createPost);

router.post('/:id/share', protect, sharePost);
router.route('/:id')
  .get(protect, getPostById)
  .delete(protect, sellerOnly, deletePost);

module.exports = router;