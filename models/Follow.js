const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Follow = sequelize.define('Follow', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  followerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'follower_id'
  },
  followingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'following_id'
  }
}, {
  timestamps: true,
  tableName: 'follows',
  indexes: [
    {
      unique: true,
      fields: ['follower_id', 'following_id']
    }
  ]
});

module.exports = Follow;