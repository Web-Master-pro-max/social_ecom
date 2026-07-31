const express = require('express');
const router = express.Router();
const { Banner } = require('../models');

// GET /api/banners - Fetch active homepage banners
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    res.json({ banners });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
