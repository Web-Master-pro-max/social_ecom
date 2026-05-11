const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LiveSession = sequelize.define('LiveSession', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'live', 'ended', 'cancelled'),
    defaultValue: 'scheduled'
  },
  scheduledTime: {
    type: DataTypes.DATE,
    field: 'scheduled_time'
  },
  startTime: {
    type: DataTypes.DATE,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.DATE,
    field: 'end_time'
  },
  viewerCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'viewer_count'
  },
  recording: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  products: {
    type: DataTypes.TEXT,
    get() {
      const rawValue = this.getDataValue('products');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('products', JSON.stringify(value));
    }
  }
}, {
  timestamps: true,
  tableName: 'live_sessions'
});

module.exports = LiveSession;