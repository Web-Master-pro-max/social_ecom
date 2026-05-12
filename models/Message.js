const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chatId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'chat_id'
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'sender_id'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'product'),
    defaultValue: 'text'
  },
  attachment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Image URL or file path'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'product_id'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read'
  }
}, {
  timestamps: true,
  tableName: 'messages'
});

module.exports = Message;