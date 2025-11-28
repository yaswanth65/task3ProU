import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || '';

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  
  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }
    
    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
    
    // Re-attach all listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }
  
  off(event: string, callback: (data: unknown) => void) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
    
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
  
  emit(event: string, data?: unknown) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }
  
  get isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socket = new SocketManager();

// Hook for using socket in components
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useSocket() {
  const { token, isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    if (isAuthenticated && token) {
      socket.connect(token);
    } else {
      socket.disconnect();
    }
    
    return () => {
      // Don't disconnect on cleanup, only when auth changes
    };
  }, [isAuthenticated, token]);
  
  return socket;
}

export function useSocketEvent(event: string, callback: (data: unknown) => void) {
  useEffect(() => {
    socket.on(event, callback);
    
    return () => {
      socket.off(event, callback);
    };
  }, [event, callback]);
}
