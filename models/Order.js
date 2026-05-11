const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.STRING,
    unique: true,
    field: 'order_id'
  },
  buyerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'buyer_id'
  },
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'seller_id'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_amount'
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'),
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.ENUM('razorpay', 'cod'),
    allowNull: false,
    field: 'payment_method'
  },
  paymentId: {
    type: DataTypes.STRING,
    field: 'payment_id'
  },
  shippingAddress: {
    type: DataTypes.TEXT,
    field: 'shipping_address'
  },
  trackingId: {
    type: DataTypes.STRING,
    field: 'tracking_id'
  },
  deliveredAt: {
    type: DataTypes.DATE,
    field: 'delivered_at'
  }
}, {
  timestamps: true,
  tableName: 'orders'
});

module.exports = Order;