const express = require('express');
const { protect, sellerOnly } = require('../middleware/auth');
const {
  createLiveSession,
  startLiveSession,
  endLiveSession,
  getLiveSessions,
  joinLiveSession
} = require('../controllers/liveController');

const router = express.Router();

router.get('/active', getLiveSessions);
router.post('/', protect, sellerOnly, createLiveSession);
router.post('/:id/start', protect, sellerOnly, startLiveSession);
router.post('/:id/end', protect, sellerOnly, endLiveSession);
router.post('/:id/join', protect, joinLiveSession);

module.exports = router;