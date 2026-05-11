const { User, Product, Order, OrderItem } = require('../models');

exports.getAdminStats = async (req, res) => {
  try {
    const [usersCount, productsCount, ordersCount, orders] = await Promise.all([
      User.count(),
      Product.count(),
      Order.count(),
      Order.findAll({ include: [{ model: OrderItem, as: 'items' }] })
    ]);

    const revenue = orders.reduce((sum, order) => {
      const orderTotal = order.items?.reduce((itemSum, item) => itemSum + parseFloat(item.price || 0) * (item.quantity || 0), 0) || 0;
      return sum + orderTotal;
    }, 0);

    res.json({ usersCount, productsCount, ordersCount, revenue });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'storeName', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      attributes: { exclude: ['shippingAddress'] },
      include: [
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'storeName'] },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'price'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'storeName', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAdminProduct = async (req, res) => {
  try {
    const { sellerId, name, description, price, category, stock, isAvailable } = req.body;
    const product = await Product.create({
      sellerId: sellerId || req.user.id,
      name,
      description,
      price,
      category,
      stock,
      isAvailable: isAvailable !== undefined ? isAvailable : true
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAdminProduct = async (req, res) => {
  try {
    const [updated] = await Product.update(req.body, {
      where: { id: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = await Product.findByPk(req.params.id, {
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'storeName', 'email'] }]
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAdminProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const existingOrderItems = await OrderItem.count({
      where: { productId }
    });

    if (existingOrderItems > 0) {
      return res.status(400).json({
        message: 'Cannot delete product because it is referenced by existing orders. Please mark it as unavailable instead.'
      });
    }

    const deleted = await Product.destroy({
      where: { id: productId }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAdminUser = async (req, res) => {
  try {
    const allowed = ['role', 'isActive', 'name', 'storeName'];
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowed.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const [updated] = await User.update(updates, {
      where: { id: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'role', 'storeName', 'isActive', 'createdAt']
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAdminOrderStatus = async (req, res) => {
  try {
    const { status, trackingId } = req.body;
    const [updated] = await Order.update(
      {
        status,
        trackingId,
        deliveredAt: status === 'delivered' ? new Date() : null
      },
      { where: { id: req.params.id } }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = await Order.findByPk(req.params.id, {
      attributes: { exclude: ['shippingAddress'] }
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAdminUser = async (req, res) => {
  const productId = req.params.id;
  const transaction = await Product.sequelize.transaction();

  try {
    await OrderItem.destroy({ where: { productId }, transaction });

    const deleted = await Product.destroy({
      where: { id: productId },
      transaction
    });

    if (!deleted) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    await transaction.commit();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};
