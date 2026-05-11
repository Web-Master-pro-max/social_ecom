const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'seller_id'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'product_id'
  },
  media: {
    type: DataTypes.TEXT,
    get() {
      const rawValue = this.getDataValue('media');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('media', JSON.stringify(value));
    }
  },
  shares: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  tableName: 'posts'
});

module.exports = Post;