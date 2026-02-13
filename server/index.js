require('dotenv').config();
const express = require('express');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');
const mediaRoutes = require('./routes/media');
const storyRoutes = require('./routes/stories');
const { setupSocketHandlers } = require('./socket/handlers');

const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const server = http.createServer(app);

// Configure CORS - allow the domain in production
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['*'];

const io = new Server(server, {
  cors: {
    origin: isProduction ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  maxHttpBufferSize: 50 * 1024 * 1024,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Trust proxy (needed behind Hostinger's reverse proxy / Nginx)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: isProduction ? allowedOrigins : '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, {
  maxAge: isProduction ? '7d' : 0
}));

// Serve client build in production
if (isProduction) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist, {
    maxAge: '1y',
    immutable: true,
    index: false // Let the catch-all handle index.html
  }));
}

// Initialize database
const db = initDB();

// Make db and io available to routes
app.set('db', db);
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/stories', storyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ICE servers config for WebRTC - allows dynamic TURN config from env
app.get('/api/ice-servers', (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Free public TURN servers
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ];

  // Allow custom TURN server from environment
  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || ''
    });
  }

  res.json({ iceServers });
});

// Setup Socket.IO
setupSocketHandlers(io, db);

// Serve client in production (SPA catch-all)
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`\n🚀 Nexus Chat Server running on http://${HOST}:${PORT}`);
  console.log(`📡 WebSocket ready for connections`);
  console.log(`🔒 End-to-end encryption enabled`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
