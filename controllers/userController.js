const { User, Follow } = require('../models');
const { Op } = require('sequelize');

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    
    const isFollowing = await Follow.findOne({
      where: {
        followerId: req.user.id,
        followingId: req.params.id
      }
    });
    
    res.json({
      ...user.toJSON(),
      isFollowing: !!isFollowing
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.followUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }
    
    const userToFollow = await User.findByPk(id);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const existingFollow = await Follow.findOne({
      where: {
        followerId: req.user.id,
        followingId: id
      }
    });
    
    if (existingFollow) {
      return res.status(400).json({ message: 'Already following this user' });
    }
    
    await Follow.create({
      followerId: req.user.id,
      followingId: id
    });
    
    res.json({ message: 'User followed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await Follow.destroy({
      where: {
        followerId: req.user.id,
        followingId: id
      }
    });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Follow relationship not found' });
    }
    
    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const followers = await Follow.findAll({
      where: { followingId: req.params.id },
      include: [{
        model: User,
        as: 'follower',
        attributes: ['id', 'name', 'profilePicture', 'storeName']
      }]
    });
    
    res.json(followers.map(f => f.follower));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const following = await Follow.findAll({
      where: { followerId: req.params.id },
      include: [{
        model: User,
        as: 'following',
        attributes: ['id', 'name', 'profilePicture', 'storeName']
      }]
    });
    
    res.json(following.map(f => f.following));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};