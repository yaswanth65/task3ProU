import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { connectDB } from './config/database.js';
import { setupSocketHandlers } from './socket/index.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import taskRoutes from './routes/task.routes.js';
import messageRoutes from './routes/message.routes.js';
import reportRoutes from './routes/report.routes.js';
import uploadRoutes from './routes/upload.routes.js';

const app = express();
const httpServer = createServer(app);

// Determine allowed frontend origins (supports single env var or defaults)
const allowedOrigins: string[] = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:3000', 'http://localhost:3001'];

// Socket.IO setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow same-origin requests (no origin header) and configured origins
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(allowed => origin.startsWith(allowed) || allowed === '*')) {
        return callback(null, true);
      }
      // In production with same-domain setup, allow the request
      if (process.env.NODE_ENV === 'production') {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
const isDev = process.env.NODE_ENV !== 'production';

// In production with same-domain setup (frontend served by same server), 
// we need to allow same-origin requests. Also allow configured FRONTEND_URL(s).
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (same-origin, server-to-server, curl)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (isDev) return callback(null, true);
    
    // In production, allow configured origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    // Also allow the Render domain itself (same-origin setup)
    if (origin.includes('onrender.com') || origin.includes('render.com')) {
      return callback(null, true);
    }

    callback(null, true); // Allow all in production since frontend is same-origin
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

console.log('CORS mode:', isDev ? 'development (allow any origin)' : 'production (same-origin + configured)');
console.log('Allowed CORS origins:', allowedOrigins.join(', '));

// Rate limiting
// TODO: Production hardening - implement Redis-based rate limiting for distributed systems
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve frontend static files in production
// IMPORTANT: This must come BEFORE API routes to properly serve CSS/JS with correct MIME types
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(process.cwd(), 'public');
  
  // Serve static assets with proper MIME types
  app.use(express.static(publicPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      // Set proper content types for assets
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
    }
  }));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Serve frontend for all non-API routes in production (SPA support)
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(process.cwd(), 'public');
  app.get('*', (req, res, next) => {
    // Skip API routes, uploads, socket.io, and static assets
    if (
      req.path.startsWith('/api') || 
      req.path.startsWith('/uploads') || 
      req.path.startsWith('/socket.io') ||
      req.path.includes('.') // Skip requests for files with extensions (css, js, images, etc.)
    ) {
      return next();
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  // TODO: Production hardening - implement proper error logging (e.g., Sentry, LogRocket)
  
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
});

// Setup WebSocket handlers
setupSocketHandlers(io);

// Start server
const PORT = parseInt(process.env.PORT || '5000');
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    await connectDB();
    
    httpServer.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on ${HOST}:${PORT}`);
      console.log(`📡 WebSocket server ready`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app, io };
