const { Post, User, Product, Comment, Like, Follow } = require('../models');
const { Op } = require('sequelize');

exports.createPost = async (req, res) => {
  try {
    const post = await Post.create({
      content: req.body.content,
      productId: req.body.productId || null,
      sellerId: req.user.id,
      media: req.body.media || []
    });
    
    const populatedPost = await Post.findByPk(post.id, {
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'profilePicture', 'storeName'] },
        { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'images'] }
      ]
    });
    
    
    const followers = await Follow.findAll({
      where: { followingId: req.user.id },
      attributes: ['followerId']
    });
    
    const io = req.app.get('io');
    followers.forEach(follower => {
      io.to(`user_${follower.followerId}`).emit('newPost', populatedPost);
    });
    
    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20, feedType = 'following' } = req.query;
    const offset = (page - 1) * limit;
    
    let where = {};
    const following = await Follow.findAll({
      where: { followerId: req.user.id },
      attributes: ['followingId']
    });
    const followingIds = following.map(f => f.followingId);

    if (feedType === 'following') {
      where = {
        sellerId: { [Op.in]: followingIds.length ? followingIds : [0] }
      };
    } else if (feedType === 'trending') {
      where = { views: { [Op.gt]: 100 } };
    } else {
      where = {};
    }

    where = {
      ...where,
      content: { [Op.notLike]: 'Review thread for product %' }
    };
    
    const { count, rows } = await Post.findAndCountAll({
      where,
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'profilePicture', 'storeName'] },
        { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'images'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    
    for (let post of rows) {
      const likeCount = await Like.count({ where: { postId: post.id } });
      const commentCount = await Comment.count({ where: { postId: post.id } });
      post.dataValues.likeCount = likeCount;
      post.dataValues.commentCount = commentCount;
    }
    
    res.json({
      posts: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'profilePicture', 'storeName'] },
        { model: Product, as: 'product', attributes: ['id', 'name', 'price', 'images'] },
        {
          model: Comment,
          as: 'comments',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'profilePicture'] }]
        }
      ]
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    
    post.views += 1;
    await post.save();
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const deleted = await Post.destroy({
      where: { id: req.params.id, sellerId: req.user.id }
    });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sharePost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    post.shares += 1;
    await post.save();
    
    res.json({ message: 'Post shared successfully', shares: post.shares });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};