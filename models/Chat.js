const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  participant1Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'participant1_id'
  },
  participant2Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'participant2_id'
  },
  lastMessage: {
    type: DataTypes.TEXT,
    field: 'last_message'
  },
  lastMessageTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_message_time'
  }
}, {
  timestamps: true,
  tableName: 'chats'
});

module.exports = Chat;