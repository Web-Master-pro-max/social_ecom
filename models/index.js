const User = require('./User');
const Product = require('./Product');
const Post = require('./Post');
const Comment = require('./Comment');
const Like = require('./Like');
const Chat = require('./Chat');
const Message = require('./Message');
const LiveSession = require('./LiveSession');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Follow = require('./Follow');


User.hasMany(Product, { as: 'products', foreignKey: 'sellerId' });
Product.belongsTo(User, { as: 'seller', foreignKey: 'sellerId' });


User.hasMany(Post, { as: 'posts', foreignKey: 'sellerId' });
Post.belongsTo(User, { as: 'seller', foreignKey: 'sellerId' });
Post.belongsTo(Product, { as: 'product', foreignKey: 'productId' });


User.hasMany(Comment, { as: 'comments', foreignKey: 'userId' });
Comment.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Comment.belongsTo(Post, { as: 'post', foreignKey: 'postId' });


Post.hasMany(Comment, { as: 'comments', foreignKey: 'postId' });


Like.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Like.belongsTo(Post, { as: 'post', foreignKey: 'postId' });
User.hasMany(Like, { as: 'likes', foreignKey: 'userId' });
Post.hasMany(Like, { as: 'likes', foreignKey: 'postId' });


Chat.hasMany(Message, { as: 'messages', foreignKey: 'chatId' });
Message.belongsTo(Chat, { as: 'chat', foreignKey: 'chatId' });
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Chat.belongsTo(User, { as: 'participant1', foreignKey: 'participant1Id' });
Chat.belongsTo(User, { as: 'participant2', foreignKey: 'participant2Id' });
Chat.belongsTo(Product, { as: 'product', foreignKey: 'productId' });


User.hasMany(Order, { as: 'buyerOrders', foreignKey: 'buyerId' });
User.hasMany(Order, { as: 'sellerOrders', foreignKey: 'sellerId' });
Order.belongsTo(User, { as: 'buyer', foreignKey: 'buyerId' });
Order.belongsTo(User, { as: 'seller', foreignKey: 'sellerId' });
Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { as: 'order', foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { as: 'product', foreignKey: 'productId' });


LiveSession.belongsTo(User, { as: 'seller', foreignKey: 'sellerId' });
User.hasMany(LiveSession, { as: 'liveSessions', foreignKey: 'sellerId' });


Follow.belongsTo(User, { as: 'follower', foreignKey: 'followerId' });
Follow.belongsTo(User, { as: 'following', foreignKey: 'followingId' });

module.exports = {
  User,
  Product,
  Post,
  Comment,
  Like,
  Chat,
  Message,
  LiveSession,
  Order,
  OrderItem,
  Follow
};