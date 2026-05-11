const { Like, Post } = require('../models');
const { sequelize } = require('../config/database');

exports.toggleLike = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { postId } = req.body;
    
    const existingLike = await Like.findOne({
      where: { userId: req.user.id, postId }
    });
    
    if (existingLike) {
      await existingLike.destroy({ transaction });
      await Post.update(
        { likesCount: sequelize.literal('likes_count - 1') },
        { where: { id: postId }, transaction }
      );
      await transaction.commit();
      res.json({ liked: false, message: 'Post unliked' });
    } else {
      await Like.create({
        userId: req.user.id,
        postId
      }, { transaction });
      await Post.update(
        { likesCount: sequelize.literal('likes_count + 1') },
        { where: { id: postId }, transaction }
      );
      await transaction.commit();
      res.json({ liked: true, message: 'Post liked' });
    }
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

exports.getLikes = async (req, res) => {
  try {
    const likes = await Like.findAll({
      where: { postId: req.params.postId },
      include: [{ association: 'user', attributes: ['id', 'name', 'profilePicture'] }]
    });
    res.json(likes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};