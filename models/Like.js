const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Like = sequelize.define('Like', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'post_id'
  },
  commentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'comment_id'
  }
}, {
  timestamps: true,
  tableName: 'likes',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'post_id']
    },
    {
      unique: true,
      fields: ['user_id', 'comment_id']
    }
  ]
});

module.exports = Like;