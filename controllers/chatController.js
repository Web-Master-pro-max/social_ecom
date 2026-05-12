const { Chat, Message, User, Product } = require('../models');
const { Op } = require('sequelize');

// Get or create a chat between buyer and seller for a product
exports.getOrCreateProductChat = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const product = await Product.findByPk(productId, {
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'storeName'] }]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const sellerId = product.sellerId;

    // Case 1: If user is the seller, find all chats for this product
    if (userId === sellerId) {
      // Seller viewing chats on their own product
      const chats = await Chat.findAll({
        where: {
          productId: productId
        },
        include: [
          {
            model: User,
            as: 'participant1',
            attributes: ['id', 'name', 'storeName', 'profilePicture']
          },
          {
            model: User,
            as: 'participant2',
            attributes: ['id', 'name', 'storeName', 'profilePicture']
          },
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'price', 'images']
          }
        ],
        order: [['lastMessageTime', 'DESC']]
      });

      if (chats.length === 0) {
        return res.status(404).json({ message: 'No chats found for this product' });
      }

      // Return all chats (seller can access all buyer chats for their product)
      return res.json({ chats, isSellerView: true });
    }

    // Case 2: If user is a buyer, find or create chat with the seller
    const buyerId = userId;

    // Find existing chat or create new one
    let chat = await Chat.findOne({
      where: {
        productId: productId,
        [Op.or]: [
          { [Op.and]: [{ participant1Id: buyerId }, { participant2Id: sellerId }] },
          { [Op.and]: [{ participant1Id: sellerId }, { participant2Id: buyerId }] }
        ]
      }
    });

    if (!chat) {
      chat = await Chat.create({
        participant1Id: buyerId,
        participant2Id: sellerId,
        productId: productId,
        buyerId: buyerId,
        sellerId: sellerId
      });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get chat messages
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Verify user is part of this chat
    const chat = await Chat.findByPk(chatId);
    if (!chat || (chat.participant1Id !== req.user.id && chat.participant2Id !== req.user.id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { count, rows } = await Message.findAndCountAll({
      where: { chatId },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'storeName', 'profilePicture'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      messages: rows.reverse(),
      totalMessages: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message, type = 'text', attachment } = req.body;
    const senderId = req.user.id;

    // Verify user is part of this chat
    const chat = await Chat.findByPk(chatId);
    if (!chat || (chat.participant1Id !== senderId && chat.participant2Id !== senderId)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Create message
    const newMessage = await Message.create({
      chatId,
      senderId,
      message: message || null,
      type,
      attachment: attachment || null
    });

    // Update chat's last message
    await chat.update({
      lastMessage: message || `[${type.toUpperCase()}]`,
      lastMessageTime: new Date()
    });

    // Fetch full message with sender details
    const populatedMessage = await Message.findByPk(newMessage.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'storeName', 'profilePicture'] }]
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark messages as read
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify user is part of this chat
    const chat = await Chat.findByPk(chatId);
    if (!chat || (chat.participant1Id !== userId && chat.participant2Id !== userId)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Mark all unread messages from other participant as read
    await Message.update(
      { isRead: true },
      {
        where: {
          chatId,
          senderId: { [Op.ne]: userId },
          isRead: false
        }
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's chat list
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Chat.findAndCountAll({
      where: {
        [Op.or]: [{ participant1Id: userId }, { participant2Id: userId }]
      },
      include: [
        {
          model: User,
          as: 'participant1',
          attributes: ['id', 'name', 'storeName', 'profilePicture'],
          foreignKey: 'participant1Id'
        },
        {
          model: User,
          as: 'participant2',
          attributes: ['id', 'name', 'storeName', 'profilePicture'],
          foreignKey: 'participant2Id'
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price', 'images']
        }
      ],
      order: [['lastMessageTime', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      chats: rows,
      totalChats: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get unread message count for a chat
exports.getUnreadCount = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify user is part of this chat
    const chat = await Chat.findByPk(chatId);
    if (!chat || (chat.participant1Id !== userId && chat.participant2Id !== userId)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const unreadCount = await Message.count({
      where: {
        chatId,
        senderId: { [Op.ne]: userId },
        isRead: false
      }
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search chats
exports.searchChats = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;

    if (!query || query.trim().length < 2) {
      return res.json({ chats: [] });
    }

    const chats = await Chat.findAll({
      where: {
        [Op.or]: [{ participant1Id: userId }, { participant2Id: userId }]
      },
      include: [
        {
          model: User,
          as: 'participant1',
          attributes: ['id', 'name', 'storeName', 'profilePicture'],
          where: {
            [Op.or]: [
              { name: { [Op.like]: `%${query}%` } },
              { storeName: { [Op.like]: `%${query}%` } }
            ]
          },
          required: false
        },
        {
          model: User,
          as: 'participant2',
          attributes: ['id', 'name', 'storeName', 'profilePicture'],
          where: {
            [Op.or]: [
              { name: { [Op.like]: `%${query}%` } },
              { storeName: { [Op.like]: `%${query}%` } }
            ]
          },
          required: false
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price', 'images'],
          where: { name: { [Op.like]: `%${query}%` } },
          required: false
        }
      ],
      order: [['lastMessageTime', 'DESC']]
    });

    res.json({ chats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
