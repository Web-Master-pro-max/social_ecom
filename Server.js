const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const { connectDB } = require('./config/database');
const { setupSocketHandlers } = require('./socket/socketHandler');


const models = require('./models');
const { sequelize } = require('./config/database');


const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const userRoutes = require('./routes/users');
const likeRoutes = require('./routes/likes');
const orderRoutes = require('./routes/orders');
const liveRoutes = require('./routes/live');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


connectDB();

const { User } = require('./models');

async function ensureAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@apnamarket.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminName = process.env.ADMIN_NAME || 'Apna Market Admin';

  try {
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    if (!existingAdmin) {
      await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      console.log(`Admin account created: ${adminEmail}`);
    }
  } catch (error) {
    console.error('Failed to create admin account:', error);
  }
}

ensureAdminUser();


setupSocketHandlers(io);
app.set('io', io);


app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chats', chatRoutes);


app.use(express.static(path.join(__dirname, 'public')));


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

function normalizePort(val) {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
}

let PORT = normalizePort(process.env.PORT || '5000');
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (error) => {
  if (error.syscall !== 'listen') throw error;

  const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE': {
      const nextPort = typeof PORT === 'number' ? PORT + 1 : PORT;
      if (nextPort === PORT) {
        console.error(`${bind} is already in use`);
        process.exit(1);
      }
      console.warn(`${bind} is in use, retrying on port ${nextPort}...`);
      PORT = nextPort;
      server.listen(PORT);
      break;
    }
    default:
      throw error;
  }
});