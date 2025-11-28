import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

interface JwtPayload {
  userId: string;
  role: string;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

// Track online users
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socket IDs

export const setupSocketHandlers = (io: Server): void => {
  // Authentication middleware for sockets
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      const jwtSecret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }
      
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });
  
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    
    console.log(`User connected: ${userId} (socket: ${socket.id})`);
    
    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);
    
    // Join user's personal room for direct messages
    socket.join(`user:${userId}`);
    
    // Broadcast user online status
    io.emit('user:online', { userId, online: true });
    
    // Join default channels
    socket.join('channel:general');
    
    // Handle joining channels
    socket.on('channel:join', (channel: string) => {
      socket.join(`channel:${channel}`);
      console.log(`User ${userId} joined channel: ${channel}`);
    });
    
    // Handle leaving channels
    socket.on('channel:leave', (channel: string) => {
      socket.leave(`channel:${channel}`);
      console.log(`User ${userId} left channel: ${channel}`);
    });
    
    // Handle typing indicators
    socket.on('typing:start', (data: { channel?: string; recipientId?: string }) => {
      if (data.channel) {
        socket.to(`channel:${data.channel}`).emit('typing', { userId, typing: true });
      } else if (data.recipientId) {
        socket.to(`user:${data.recipientId}`).emit('typing', { userId, typing: true });
      }
    });
    
    socket.on('typing:stop', (data: { channel?: string; recipientId?: string }) => {
      if (data.channel) {
        socket.to(`channel:${data.channel}`).emit('typing', { userId, typing: false });
      } else if (data.recipientId) {
        socket.to(`user:${data.recipientId}`).emit('typing', { userId, typing: false });
      }
    });
    
    // Handle presence updates
    socket.on('presence:update', (status: 'online' | 'away' | 'busy') => {
      io.emit('user:presence', { userId, status });
    });
    
    // Handle task subscriptions (for real-time task updates)
    socket.on('task:subscribe', (taskId: string) => {
      socket.join(`task:${taskId}`);
    });
    
    socket.on('task:unsubscribe', (taskId: string) => {
      socket.leave(`task:${taskId}`);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId} (socket: ${socket.id})`);
      
      // Remove socket from user's connections
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        
        // If user has no more connections, mark as offline
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user:online', { userId, online: false });
        }
      }
    });
    
    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });
  
  // Utility function to get online users
  (io as unknown as { getOnlineUsers: () => string[] }).getOnlineUsers = () => {
    return Array.from(onlineUsers.keys());
  };
  
  // Utility function to check if user is online
  (io as unknown as { isUserOnline: (userId: string) => boolean }).isUserOnline = (userId: string) => {
    return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
  };
};

export { onlineUsers };
