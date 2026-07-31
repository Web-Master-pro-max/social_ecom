const path = require('path');
const { Product, User, Comment, Post, OrderItem } = require('../models');
const { Op } = require('sequelize');

const parseImageField = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  try {
    return JSON.parse(field);
  } catch {
    return String(field).split(',').map(item => item.trim()).filter(Boolean);
  }
};

exports.createProduct = async (req, res) => {
  try {
    const uploadedImages = (req.files || []).slice(0, 9).map(file => `/uploads/${path.basename(file.path)}`);
    const autoEnrich = req.body.autoEnrich === 'true' || req.body.autoEnrich === true || (req.body.autoEnrich === undefined && !req.body.specifications && !req.body.features);

    let specifications = req.body.specifications ? (typeof req.body.specifications === 'string' ? (req.body.specifications.startsWith('{') ? JSON.parse(req.body.specifications) : {}) : req.body.specifications) : null;
    let options = req.body.options ? (typeof req.body.options === 'string' ? (req.body.options.startsWith('[') ? JSON.parse(req.body.options) : []) : req.body.options) : null;
    let features = req.body.features ? (typeof req.body.features === 'string' ? (req.body.features.startsWith('[') ? JSON.parse(req.body.features) : req.body.features.split('\n').map(s => s.trim()).filter(Boolean)) : req.body.features) : null;

    if (autoEnrich && (!specifications || !Object.keys(specifications).length || !features || !features.length)) {
      try {
        const aiService = require('../services/aiService');
        const enriched = await aiService.enrichProductDetails({
          name: req.body.name,
          category: req.body.category,
          description: req.body.description
        });
        if ((!specifications || !Object.keys(specifications).length) && enriched.specifications) specifications = enriched.specifications;
        if ((!options || !options.length) && enriched.options) options = enriched.options;
        if ((!features || !features.length) && enriched.features) features = enriched.features;
      } catch (e) {
        console.error('AI enrichment failed during product creation:', e);
      }
    }

    const payload = {
      name: req.body.name,
      category: req.body.category,
      description: req.body.description,
      price: parseFloat(req.body.price) || 0,
      stock: parseInt(req.body.stock, 10) || 0,
      isAvailable: req.body.isAvailable === 'true' || req.body.isAvailable === true,
      images,
      condition: req.body.condition || 'New',
      options: options || [],
      specifications: specifications || {},
      features: features || [],
      sellerId: req.user.id
    };

    const product = await Product.create(payload);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, sellerId } = req.query;
    const offset = (page - 1) * limit;
    
    const where = { isAvailable: true };
    if (category) where.category = category;
    if (sellerId) where.sellerId = sellerId;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'seller',
        attributes: ['id', 'name', 'storeName', 'profilePicture']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      products: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'seller',
        attributes: ['id', 'name', 'storeName', 'profilePicture', 'bio']
      }]
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const existingProduct = await Product.findByPk(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const uploadedImages = (req.files || []).slice(0, 9).map(file => `/uploads/${path.basename(file.path)}`);
    const originalImages = existingProduct.images || [];
    const existingImages = parseImageField(req.body.existingImages || req.body.images);
    const images = uploadedImages.length
      ? [...existingImages, ...uploadedImages]
      : (existingImages.length ? existingImages : originalImages);

    const payload = {
      name: req.body.name,
      category: req.body.category,
      description: req.body.description,
      price: parseFloat(req.body.price) || 0,
      stock: parseInt(req.body.stock, 10) || 0,
      isAvailable: req.body.isAvailable === 'true' || req.body.isAvailable === true,
      images,
      condition: req.body.condition || 'New'
    };

    const [updated] = await Product.update(payload, {
      where: { id: req.params.id, sellerId: req.user.id }
    });
    
    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = await Product.findByPk(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const existingOrderItems = await OrderItem.count({
      where: { productId }
    });

    if (existingOrderItems > 0) {
      return res.status(400).json({
        message: 'Cannot delete product because it has existing order history. Please mark it as unavailable instead.'
      });
    }

    const deleted = await Product.destroy({
      where: { id: productId, sellerId: req.user.id }
    });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSellerProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { sellerId: req.params.sellerId },
      order: [['createdAt', 'DESC']]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductPosts = async (req, res) => {
  try {
    const posts = await Post.findAll({
      where: {
        productId: req.params.id,
        content: { [Op.notLike]: 'Review thread for product %' }
      },
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'storeName', 'profilePicture'] },
        { model: Comment, as: 'comments', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'profilePicture'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const reviews = await Comment.findAll({
      where: {
        rating: { [Op.ne]: null }
      },
      include: [
        {
          model: Post,
          as: 'post',
          where: {
            productId: req.params.id,
            content: { [Op.like]: 'Review thread for product %' }
          },
          attributes: ['id', 'sellerId']
        },
        { model: User, as: 'user', attributes: ['id', 'name', 'profilePicture'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createProductReview = async (req, res) => {
  try {
    const { content, rating } = req.body;
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const [reviewPost] = await Post.findOrCreate({
      where: {
        productId: product.id,
        content: `Review thread for product ${product.name}`
      },
      defaults: {
        sellerId: product.sellerId,
        content: `Review thread for product ${product.name}`,
        productId: product.id
      }
    });

    const comment = await Comment.create({
      userId: req.user.id,
      postId: reviewPost.id,
      content,
      rating
    });

    const updatedAverage = rating ? ((product.averageRating * product.ratingCount + rating) / (product.ratingCount + 1)) : product.averageRating;
    await Product.update({
      averageRating: updatedAverage,
      ratingCount: rating ? product.ratingCount + 1 : product.ratingCount
    }, {
      where: { id: product.id }
    });

    const populatedComment = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'profilePicture'] }]
    });

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};