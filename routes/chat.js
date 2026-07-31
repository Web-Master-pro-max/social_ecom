const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// Get or create chat with AI Assistant
router.get('/ai', protect, chatController.getOrCreateAiChat);

// Get or create chat for a product
router.get('/product/:productId', protect, chatController.getOrCreateProductChat);

// Get chat by ID
router.get('/:chatId', protect, chatController.getChatById);

// Get chat messages
router.get('/:chatId/messages', protect, chatController.getChatMessages);

// Send message
router.post('/:chatId/messages', protect, chatController.sendMessage);

// Mark messages as read
router.put('/:chatId/read', protect, chatController.markMessagesAsRead);

// Get user's chats
router.get('/', protect, chatController.getUserChats);

// Get unread count for a chat
router.get('/:chatId/unread', protect, chatController.getUnreadCount);

// Search chats
router.get('/search/query', protect, chatController.searchChats);

module.exports = router;
