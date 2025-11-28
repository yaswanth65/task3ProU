import { create } from 'zustand';
import api from '../lib/api';
import { socket } from '../lib/socket';

export interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  recipient?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  channel?: string;
  taskRef?: string;
  mentions: Array<{
    _id: string;
    firstName: string;
    lastName: string;
  }>;
  readBy: Array<{
    user: string;
    readAt: string;
  }>;
  isEdited: boolean;
  replyTo?: Message;
  reactions: Array<{
    emoji: string;
    users: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    lastSeen: string;
  };
  lastMessage: Message;
  unreadCount: number;
}

interface MessageState {
  messages: Message[];
  conversations: Conversation[];
  activeChannel: string | null;
  activeRecipient: string | null;
  isLoading: boolean;
  hasMore: boolean;
  unreadCount: {
    total: number;
    byChannel: Record<string, number>;
    byConversation: Record<string, number>;
  };
  typingUsers: Record<string, boolean>;
  
  // Actions
  fetchConversations: () => Promise<void>;
  fetchChannelMessages: (channel: string) => Promise<void>;
  fetchDirectMessages: (userId: string) => Promise<void>;
  sendMessage: (data: { content: string; channel?: string; recipient?: string; mentions?: string[] }) => Promise<void>;
  markAsRead: (messageIds: string[]) => Promise<void>;
  setActiveChannel: (channel: string | null) => void;
  setActiveRecipient: (userId: string | null) => void;
  addMessage: (message: Message) => void;
  fetchUnreadCount: () => Promise<void>;
  setTyping: (userId: string, isTyping: boolean) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  conversations: [],
  activeChannel: null,
  activeRecipient: null,
  isLoading: false,
  hasMore: false,
  unreadCount: {
    total: 0,
    byChannel: {},
    byConversation: {},
  },
  typingUsers: {},
  
  fetchConversations: async () => {
    try {
      const response = await api.get('/messages/conversations');
      set({ conversations: response.data.conversations });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  },
  
  fetchChannelMessages: async (channel: string) => {
    set({ isLoading: true, messages: [], activeChannel: channel, activeRecipient: null });
    try {
      const response = await api.get(`/messages/channel/${channel}`);
      set({
        messages: response.data.messages,
        hasMore: response.data.hasMore,
        isLoading: false,
      });
      
      // Join socket room
      socket.emit('channel:join', channel);
    } catch (error) {
      console.error('Failed to fetch channel messages:', error);
      set({ isLoading: false });
    }
  },
  
  fetchDirectMessages: async (userId: string) => {
    set({ isLoading: true, messages: [], activeRecipient: userId, activeChannel: null });
    try {
      const response = await api.get(`/messages/dm/${userId}`);
      set({
        messages: response.data.messages,
        hasMore: response.data.hasMore,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch direct messages:', error);
      set({ isLoading: false });
    }
  },
  
  sendMessage: async (data) => {
    try {
      const response = await api.post('/messages', data);
      const newMessage = response.data.message;
      
      set((state) => ({
        messages: [...state.messages, newMessage],
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },
  
  markAsRead: async (messageIds: string[]) => {
    try {
      await api.post('/messages/read', { messageIds });
      
      // Update local state
      set((state) => {
        const updatedMessages = state.messages.map((msg) => {
          if (messageIds.includes(msg._id)) {
            return {
              ...msg,
              readBy: [...msg.readBy, { user: 'currentUser', readAt: new Date().toISOString() }],
            };
          }
          return msg;
        });
        
        return { messages: updatedMessages };
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },
  
  setActiveChannel: (channel: string | null) => {
    const { activeChannel } = get();
    
    // Leave previous channel
    if (activeChannel) {
      socket.emit('channel:leave', activeChannel);
    }
    
    set({ activeChannel: channel, activeRecipient: null });
    
    if (channel) {
      get().fetchChannelMessages(channel);
    }
  },
  
  setActiveRecipient: (userId: string | null) => {
    set({ activeRecipient: userId, activeChannel: null });
    
    if (userId) {
      get().fetchDirectMessages(userId);
    }
  },
  
  addMessage: (message: Message) => {
    const { activeChannel, activeRecipient, messages } = get();
    
    // Only add if relevant to current view
    if (
      (message.channel && message.channel === activeChannel) ||
      (message.recipient && 
        (message.recipient._id === activeRecipient || message.sender._id === activeRecipient))
    ) {
      // Avoid duplicates
      if (!messages.find((m) => m._id === message._id)) {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      }
    }
    
    // Update unread count
    get().fetchUnreadCount();
  },
  
  fetchUnreadCount: async () => {
    try {
      const response = await api.get('/messages/unread');
      set({ unreadCount: response.data });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },
  
  setTyping: (userId: string, isTyping: boolean) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [userId]: isTyping,
      },
    }));
    
    // Auto-clear typing after 3 seconds
    if (isTyping) {
      setTimeout(() => {
        set((state) => ({
          typingUsers: {
            ...state.typingUsers,
            [userId]: false,
          },
        }));
      }, 3000);
    }
  },
}));
