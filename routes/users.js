const express = require('express');
const { protect } = require('../middleware/auth');
const { getUserProfile, followUser, unfollowUser, getFollowers, getFollowing } = require('../controllers/userController');

const router = express.Router();

router.get('/profile/:id', protect, getUserProfile);
router.post('/follow/:id', protect, followUser);
router.delete('/unfollow/:id', protect, unfollowUser);
router.get('/followers/:id', protect, getFollowers);
router.get('/following/:id', protect, getFollowing);

module.exports = router;