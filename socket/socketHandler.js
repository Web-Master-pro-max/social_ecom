
const { Chat, Message, User, LiveSession } = require('../models');
const { Op } = require('sequelize');

const userSockets = new Map();

exports.setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('register', (userId) => {
      userSockets.set(userId, socket.id);
      socket.join(`user_${userId}`);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });
    
    
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
            lastMessageTime: new Date()
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