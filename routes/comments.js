const express = require('express');
const { protect } = require('../middleware/auth');
const { addComment, getPostComments, deleteComment } = require('../controllers/commentController');

const router = express.Router();

router.post('/', protect, addComment);
router.get('/post/:postId', getPostComments);
router.delete('/:id', protect, deleteComment);

module.exports = router;