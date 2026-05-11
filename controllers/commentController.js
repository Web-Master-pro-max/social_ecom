const { Comment, Post, Product, User } = require('../models');
const { sequelize } = require('../config/database');

exports.addComment = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { postId, content, rating } = req.body;
    
    const comment = await Comment.create({
      userId: req.user.id,
      postId,
      content,
      rating
    }, { transaction });
    
    
    const post = await Post.findByPk(postId, { transaction });
    if (post.productId && rating) {
      const product = await Product.findByPk(post.productId, { transaction });
      const newRating = (product.averageRating * product.ratingCount + rating) / (product.ratingCount + 1);
      await Product.update({
        averageRating: newRating,
        ratingCount: product.ratingCount + 1
      }, {
        where: { id: post.productId },
        transaction
      });
    }
    
    await transaction.commit();
    
    const populatedComment = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'profilePicture'] }]
    });
    
    
    const io = req.app.get('io');
    io.to(`user_${post.sellerId}`).emit('newComment', {
      postId,
      comment: populatedComment
    });
    
    res.status(201).json(populatedComment);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

exports.getPostComments = async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: { postId: req.params.postId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'profilePicture'] }],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const deleted = await Comment.destroy({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    await Post.update(
      { comments: sequelize.literal('comments - 1') },
      { where: { id: req.params.postId } }
    );
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};