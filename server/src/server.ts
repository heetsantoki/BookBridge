import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';

// Import routes
import authRoutes from './routes/authRoutes';
import resourceRoutes from './routes/resourceRoutes';
import transactionRoutes from './routes/transactionRoutes';
import messageRoutes from './routes/messageRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reviewRoutes from './routes/reviewRoutes';
import adminRoutes from './routes/adminRoutes';
import aiRoutes from './routes/aiRoutes';


const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS parameters matching client URL
const io = new Server(server, {
  cors: {
    origin: '*', // Allow connections from any origin for development convenience
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Serve uploaded static files (IDs & resource images)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Fallback status check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Socket.io Real-Time Connection handlers
io.on('connection', (socket) => {
  console.log('A client connected to Socket.io:', socket.id);

  // Set up personal room for student notification alerts
  socket.on('setup', (userId: string) => {
    socket.join(userId);
    console.log(`User registered in private socket room: ${userId}`);
    socket.emit('connected');
  });

  // Join a specific chat channel (conversationId)
  socket.on('join_chat', (room: string) => {
    socket.join(room);
    console.log(`User joined conversation room: ${room}`);
  });

  // Handle typing statuses
  socket.on('typing', (room: string) => {
    socket.in(room).emit('typing', room);
  });

  socket.on('stop_typing', (room: string) => {
    socket.in(room).emit('stop_typing', room);
  });

  // Broadcast messages to participants in real-time
  socket.on('new_message', (message) => {
    const { conversationId, receiver, sender, content } = message;

    // Broadcast message to the chat room (excluding sender)
    socket.in(conversationId).emit('message_received', message);

    // Push immediate notification to receiver's private room if they are online
    const receiverId = typeof receiver === 'object' ? receiver._id || receiver.id : receiver;
    socket.in(receiverId).emit('notification_received', {
      type: 'NewMessage',
      title: 'New Message',
      message: `${sender.name}: ${content}`,
      link: '/chat'
    });
  });

  // Broadcast transaction status updates instantly
  socket.on('transaction_update', ({ userId, type, title, message, link }) => {
    socket.in(userId).emit('notification_received', {
      type,
      title,
      message,
      link
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from Socket.io');
  });
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookbridge';
mongoose.connect(MONGODB_URI)
  .then(() => {
    const dbName = mongoose.connection.name;
    const hostName = mongoose.connection.host;
    console.log(`MongoDB successfully connected. Host: ${hostName}, Database: ${dbName}`);
    // Start Server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`BookBridge server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB database connection failure:', err);
    process.exit(1);
  });

// Global Express Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});
