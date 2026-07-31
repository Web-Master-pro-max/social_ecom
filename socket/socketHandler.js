
const { Chat, Message, User, LiveSession } = require('../models');
const { Op } = require('sequelize');
const aiService = require('../services/aiService');

const userSockets = new Map();
const userTyping = new Map();

exports.setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('register', (userId) => {
      userSockets.set(userId, socket.id);
      socket.userId = userId;
      socket.join(`user_${userId}`);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });
    
    // Join chat room - with authorization check
    socket.on('joinChat', async (chatId, userId) => {
      try {
        // Verify user is actually part of this chat
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
          socket.emit('chatError', { message: 'Chat not found' });
          return;
        }

        // Check if user is one of the two participants
        if (chat.participant1Id !== userId && chat.participant2Id !== userId) {
          socket.emit('chatError', { message: 'Unauthorized: You are not part of this chat' });
          console.warn(`Unauthorized joinChat attempt: User ${userId} tried to join chat ${chatId}`);
          return;
        }

        socket.join(`chat_${chatId}`);
        socket.chatId = chatId;
        socket.userId = userId;
        io.to(`chat_${chatId}`).emit('userOnline', { userId, status: 'online' });
        console.log(`User ${userId} authorized and joined chat ${chatId}`);
      } catch (error) {
        console.error('Join chat error:', error);
        socket.emit('chatError', { message: 'Failed to join chat' });
      }
    });
    
    // Leave chat room
    socket.on('leaveChat', async (chatId, userId) => {
      try {
        // Verify user is actually part of this chat
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
          return;
        }

        if (chat.participant1Id !== userId && chat.participant2Id !== userId) {
          console.warn(`Unauthorized leaveChat attempt: User ${userId} tried to leave chat ${chatId}`);
          return;
        }

        socket.leave(`chat_${chatId}`);
        io.to(`chat_${chatId}`).emit('userOffline', { userId, status: 'offline' });
      } catch (error) {
        console.error('Leave chat error:', error);
      }
    });
    
    // Send chat message with real-time broadcast
    socket.on('sendChatMessage', async (data) => {
      try {
        const { chatId, senderId, message, type = 'text', attachment } = data;
        
        // Get chat to find receiver
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
          socket.emit('chatError', { message: 'Chat not found' });
          return;
        }
        
        // CRITICAL: Verify sender is actually part of this chat
        if (chat.participant1Id !== senderId && chat.participant2Id !== senderId) {
          socket.emit('chatError', { message: 'Unauthorized: You are not part of this chat' });
          console.warn(`Security: User ${senderId} attempted to send message in unauthorized chat ${chatId}`);
          return;
        }
        
        // Verify sender matches socket user
        if (socket.userId && socket.userId !== senderId) {
          socket.emit('chatError', { message: 'Unauthorized: User mismatch' });
          console.warn(`Security: Socket user ${socket.userId} attempted to send as user ${senderId}`);
          return;
        }
        
        // Determine receiver ID (the other participant)
        const receiverId = chat.participant1Id === senderId ? chat.participant2Id : chat.participant1Id;
        
        // Create message in database
        const newMessage = await Message.create({
          chatId,
          senderId,
          message: message || null,
          type,
          attachment: attachment || null
        });
        
        // Get sender info
        const sender = await User.findByPk(senderId, {
          attributes: ['id', 'name', 'storeName', 'profilePicture']
        });
        
        const messageData = {
          id: newMessage.id,
          chatId,
          senderId,
          message: newMessage.message,
          type: newMessage.type,
          attachment: newMessage.attachment,
          senderName: sender.name,
          senderStore: sender.storeName,
          senderAvatar: sender.profilePicture,
          createdAt: newMessage.createdAt,
          isRead: false
        };
        
        // Only broadcast to the two participants in this specific chat
        io.to(`chat_${chatId}`).emit('newChatMessage', messageData);
        
        // Send notification to receiver (if they're online but not in chat)
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('incomingChatNotification', {
            id: newMessage.id,
            chatId,
            senderId,
            message: newMessage.message,
            type: newMessage.type,
            attachment: newMessage.attachment,
            senderName: sender.name,
            senderStore: sender.storeName,
            senderAvatar: sender.profilePicture,
            createdAt: newMessage.createdAt
          });
        }
        
        // Update chat last message
        await chat.update({
          lastMessage: message || `[${type.toUpperCase()}]`,
          lastMessageTime: new Date()
        });

        // AI BOT INTEGRATION
        const aiBotId = parseInt(process.env.AI_BOT_ID);
        if (receiverId === aiBotId) {
          process.nextTick(async () => {
            try {
              const history = await Message.findAll({
                where: { chatId },
                order: [['createdAt', 'DESC']],
                limit: 10
              });
              const chatHistory = history.reverse();
              const aiResponseText = await aiService.generateChatResponse(message, chatHistory);

              const aiMessage = await Message.create({
                chatId,
                senderId: aiBotId,
                message: aiResponseText,
                type: 'text'
              });

              await chat.update({
                lastMessage: aiResponseText,
                lastMessageTime: new Date()
              });

              const populatedAiMessage = await Message.findByPk(aiMessage.id, {
                include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'storeName', 'profilePicture'] }]
              });

              const aiMessageData = {
                id: aiMessage.id,
                chatId,
                senderId: aiBotId,
                message: aiMessage.message,
                type: aiMessage.type,
                attachment: aiMessage.attachment,
                senderName: populatedAiMessage.sender.name,
                senderStore: populatedAiMessage.sender.storeName,
                senderAvatar: populatedAiMessage.sender.profilePicture,
                createdAt: aiMessage.createdAt,
                isRead: false
              };

              io.to(`chat_${chatId}`).emit('newChatMessage', aiMessageData);
            } catch (err) {
              console.error('Error generating AI response in socket:', err);
            }
          });
        }

      } catch (error) {
        console.error('Send chat message error:', error);
        socket.emit('chatError', { message: 'Failed to send message' });
      }
    });
    
    // Typing indicator - with authorization check
    socket.on('userTyping', async (data) => {
      try {
        const { chatId, userId, isTyping } = data;
        
        // Verify user is part of this chat
        const chat = await Chat.findByPk(chatId);
        if (!chat || (chat.participant1Id !== userId && chat.participant2Id !== userId)) {
          console.warn(`Unauthorized typing: User ${userId} in chat ${chatId}`);
          return;
        }
        
        io.to(`chat_${chatId}`).emit('typingIndicator', { userId, isTyping });
      } catch (error) {
        console.error('Typing indicator error:', error);
      }
    });
    
    // Mark message as read - with authorization check
    socket.on('markAsRead', async (data) => {
      try {
        const { chatId, userId } = data;
        
        // Verify user is part of this chat
        const chat = await Chat.findByPk(chatId);
        if (!chat || (chat.participant1Id !== userId && chat.participant2Id !== userId)) {
          console.warn(`Unauthorized markAsRead: User ${userId} in chat ${chatId}`);
          return;
        }
        
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
        io.to(`chat_${chatId}`).emit('messagesRead');
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    });
    
    // Private message (legacy)
    socket.on('privateMessage', async (data) => {
      try {
        const { senderId, receiverId, message, productId } = data;
        
        let chat = await Chat.findOne({
          where: {
            [Op.or]: [
              { participant1Id: senderId, participant2Id: receiverId },
              { participant1Id: receiverId, participant2Id: senderId }
            ]
          }
        });
        
        if (!chat) {
          chat = await Chat.create({
            participant1Id: senderId,
            participant2Id: receiverId,
            lastMessage: message,
            lastMessageTime: new Date(),
            productId
          });
        } else {
          chat.lastMessage = message;
          chat.lastMessageTime = new Date();
          await chat.save();
        }
        
        const newMessage = await Message.create({
          chatId: chat.id,
          senderId,
          message,
          type: productId ? 'product' : 'text',
          productId
        });
        
        const sender = await User.findByPk(senderId, {
          attributes: ['id', 'name', 'profilePicture']
        });
        
        const messageToSend = {
          id: newMessage.id,
          chatId: chat.id,
          senderId,
          receiverId,
          message,
          type: newMessage.type,
          productId,
          senderName: sender.name,
          senderAvatar: sender.profilePicture,
          createdAt: newMessage.createdAt
        };
        
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('newMessage', messageToSend);
        }
        
        socket.emit('messageSent', messageToSend);
      } catch (error) {
        console.error('Private message error:', error);
      }
    });
    
    
    socket.on('joinLive', async (liveSessionId, userId) => {
      socket.join(`live_${liveSessionId}`);
      console.log(`User ${userId} joined live session ${liveSessionId}`);
      
      const liveSession = await LiveSession.findByPk(liveSessionId);
      if (liveSession) {
        
        liveSession.viewerCount += 1;
        await liveSession.save();
      }
      
      io.to(`live_${liveSessionId}`).emit('viewerCount', liveSession?.viewerCount || 0);
    });
    
    socket.on('liveChat', async (data) => {
      const { liveSessionId, userId, userName, message } = data;
      
      const liveSession = await LiveSession.findByPk(liveSessionId);
      if (liveSession) {
        const chatHistory = liveSession.chatHistory ? JSON.parse(liveSession.chatHistory) : [];
        chatHistory.push({ userId, userName, message, timestamp: new Date() });
        liveSession.chatHistory = JSON.stringify(chatHistory);
        await liveSession.save();
      }
      
      io.to(`live_${liveSessionId}`).emit('liveMessage', {
        liveSessionId,
        userId,
        userName,
        message,
        timestamp: new Date()
      });
    });
    
    socket.on('liveReaction', (data) => {
      const { liveSessionId, reaction } = data;
      io.to(`live_${liveSessionId}`).emit('liveReaction', { reaction });
    });
    
    socket.on('leaveLive', (liveSessionId, userId) => {
      socket.leave(`live_${liveSessionId}`);
      console.log(`User ${userId} left live session ${liveSessionId}`);
    });
    
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userTyping', {
          userId: socket.userId,
          isTyping
        });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }
    });
  });
};