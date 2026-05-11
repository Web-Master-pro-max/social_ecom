const { Order, OrderItem, Product, User } = require('../models');
const { sequelize } = require('../config/database');
const Razorpay = require('razorpay');

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
let razorpay = null;

if (razorpayKeyId && razorpayKeySecret) {
  razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret
  });
} else {
  console.warn('Razorpay credentials missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env. Razorpay payments are disabled.');
}

exports.createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { items, shippingAddress, paymentMethod = 'cod' } = req.body;
    if (!items || !Array.isArray(items) || !items.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    let totalAmount = 0;
    const orderItems = [];
    let sellerId = null;

    for (const item of items) {
      const product = await Product.findByPk(item.productId, { transaction });
      if (!product || !product.isAvailable || product.stock < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({ message: `Product ${item.productId} is not available or has insufficient stock` });
      }

      if (!sellerId) {
        sellerId = product.sellerId;
      } else if (sellerId !== product.sellerId) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Orders can only contain products from a single seller' });
      }

      totalAmount += parseFloat(product.price) * item.quantity;
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price
      });
    }

    const shippingValue = shippingAddress ? JSON.stringify(shippingAddress) : JSON.stringify({});
    const order = await Order.create({
      buyerId: req.user.id,
      sellerId,
      totalAmount,
      paymentMethod,
      shippingAddress: shippingValue,
      status: 'pending'
    }, { transaction });

    
    for (const item of orderItems) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }, { transaction });
    }

    
    for (const item of orderItems) {
      await Product.update(
        { stock: sequelize.literal(`stock - ${item.quantity}`) },
        { where: { id: item.productId }, transaction }
      );
    }

    
    if (paymentMethod === 'razorpay') {
      if (!razorpay) {
        await transaction.rollback();
        return res.status(500).json({
          message: 'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.'
        });
      }

      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        receipt: order.id.toString()
      });
      
      order.orderId = razorpayOrder.id;
      await order.save({ transaction });
      await transaction.commit();
      
      res.json({
        order,
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency
        }
      });
    } else {
      await transaction.commit();
      res.status(201).json(order);
    }
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'storeName'] }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.user.role !== 'admin' && req.user.id !== order.buyerId && req.user.id !== order.sellerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { orderId, paymentId, signature } = req.body;
    const crypto = require('crypto');
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeySecret) {
      await transaction.rollback();
      return res.status(500).json({
        message: 'Razorpay key secret is not configured. Set RAZORPAY_KEY_SECRET in .env.'
      });
    }
    
    const order = await Order.findByPk(orderId, { transaction });
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${order.orderId}|${paymentId}`)
      .digest('hex');
    
    if (generatedSignature === signature) {
      order.paymentId = paymentId;
      order.status = 'confirmed';
      await order.save({ transaction });
      await transaction.commit();
      
      res.json({ success: true, order });
    } else {
      await transaction.rollback();
      res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      attributes: { exclude: ['shippingAddress'] },
      where: { buyerId: req.user.id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        },
        { model: User, as: 'seller', attributes: ['id', 'name', 'storeName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSellerOrders = async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const orders = await Order.findAll({
      attributes: { exclude: ['shippingAddress'] },
      where: { sellerId: req.user.id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingId } = req.body;
    const updateFilter = { id: req.params.id };

    if (req.user.role === 'seller') {
      updateFilter.sellerId = req.user.id;
    }

    const [updated] = await Order.update(
      { status, trackingId, deliveredAt: status === 'delivered' ? new Date() : null },
      { where: updateFilter }
    );
    
    if (!updated) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = await Order.findByPk(req.params.id);
    
    
    const io = req.app.get('io');
    io.to(`user_${order.buyerId}`).emit('orderStatusUpdate', {
      orderId: order.id,
      status
    });
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};