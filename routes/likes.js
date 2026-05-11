const express = require('express');
const { protect } = require('../middleware/auth');
const { toggleLike, getLikes } = require('../controllers/likeController');

const router = express.Router();

router.post('/toggle', protect, toggleLike);
router.get('/post/:postId', getLikes);

module.exports = router;