import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import morgan from 'morgan';

import { testConnection } from './config/db.js';
import { runMigrations } from './database/migrate.js';
import { setSocketIO } from './services/notificationService.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import visitorRoutes from './routes/visitorRoutes.js';
import expectedVisitorRoutes from './routes/expectedVisitorRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Pass Socket.io instance to notification service
setSocketIO(io);

// Socket.io Connection Event
io.on('connection', (socket) => {
  // Join employee-specific room for targeted notifications
  socket.on('join_employee_room', (employeeId) => {
    socket.join(`employee_${employeeId}`);
    console.log(`[Socket.io] Socket ${socket.id} joined room: employee_${employeeId}`);
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve uploaded visitor photos statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'Isharwal Feed Mill Gate Entry Management System',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/expected-visitors', expectedVisitorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

// Serve built React Frontend (Production Single-Server Architecture)
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Internal Error]:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', async () => {
  console.log('========================================================');
  console.log(`🚀 ISHARWAL FEED MILL GATE ENTRY SYSTEM LIVE ON PORT ${PORT}`);
  console.log(`👉 Web Portal: http://localhost:${PORT}`);
  console.log('========================================================');
  
  // Verify Database Connection on startup
  const isConnected = await testConnection();
  if (process.env.DATABASE_URL && isConnected) {
    try {
      await runMigrations();
    } catch (migErr) {
      console.warn('[Startup Migration Warning]:', migErr.message);
    }
  }
});
