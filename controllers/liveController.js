const { LiveSession } = require('../models');

exports.createLiveSession = async (req, res) => {
  try {
    const liveSession = await LiveSession.create({
      ...req.body,
      sellerId: req.user.id,
      status: 'live',
      startTime: new Date()
    });
    
    const liveSessionWithSeller = await LiveSession.findByPk(liveSession.id, {
      include: [{ association: 'seller', attributes: ['id', 'name', 'storeName', 'profilePicture'] }]
    });
    
    const io = req.app.get('io');
    io.emit('liveStarted', liveSessionWithSeller);
    
    res.status(201).json(liveSessionWithSeller);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.startLiveSession = async (req, res) => {
  try {
    const [updated] = await LiveSession.update(
      {
        status: 'live',
        startTime: new Date()
      },
      {
        where: { id: req.params.id, sellerId: req.user.id }
      }
    );
    
    if (!updated) {
      return res.status(404).json({ message: 'Live session not found' });
    }
    
    const liveSession = await LiveSession.findByPk(req.params.id);
    
    const io = req.app.get('io');
    io.emit('liveStarted', liveSession);
    
    res.json(liveSession);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.endLiveSession = async (req, res) => {
  try {
    const [updated] = await LiveSession.update(
      {
        status: 'ended',
        endTime: new Date()
      },
      {
        where: { id: req.params.id, sellerId: req.user.id }
      }
    );
    
    if (!updated) {
      return res.status(404).json({ message: 'Live session not found' });
    }
    
    const liveSession = await LiveSession.findByPk(req.params.id);
    
    const io = req.app.get('io');
    io.emit('liveEnded', liveSession.id);
    
    res.json(liveSession);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLiveSessions = async (req, res) => {
  try {
    const liveSessions = await LiveSession.findAll({
      where: { status: 'live' },
      include: [{
        association: 'seller',
        attributes: ['id', 'name', 'storeName', 'profilePicture']
      }]
    });
    
    res.json(liveSessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.joinLiveSession = async (req, res) => {
  try {
    const liveSession = await LiveSession.findByPk(req.params.id, {
      include: [{ association: 'seller', attributes: ['id', 'name', 'storeName', 'profilePicture'] }]
    });
    if (!liveSession) {
      return res.status(404).json({ message: 'Live session not found' });
    }
    
    liveSession.viewerCount += 1;
    await liveSession.save();
    
    res.json(liveSession);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};