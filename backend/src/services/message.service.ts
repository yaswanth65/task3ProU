import { Message, IMessage } from '../models/index.js';
import mongoose, { Types } from 'mongoose';

interface SendMessageData {
  content: string;
  recipient?: string;
  channel?: string;
  taskRef?: string;
  mentions?: string[];
  replyTo?: string;
}

interface MessageFilters {
  channel?: string;
  recipient?: string;
  sender?: string;
  taskRef?: string;
  since?: Date;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  before?: Date;
}

class MessageService {
  /**
   * Send a new message
   */
  async sendMessage(data: SendMessageData, senderId: string): Promise<IMessage> {
    const message = new Message({
      content: data.content,
      sender: new Types.ObjectId(senderId),
      recipient: data.recipient ? new Types.ObjectId(data.recipient) : undefined,
      channel: data.channel,
      taskRef: data.taskRef ? new Types.ObjectId(data.taskRef) : undefined,
      mentions: data.mentions?.map(id => new Types.ObjectId(id)) || [],
      replyTo: data.replyTo ? new Types.ObjectId(data.replyTo) : undefined,
    });
    
    await message.save();
    
    return message.populate([
      { path: 'sender', select: 'firstName lastName email avatar' },
      { path: 'recipient', select: 'firstName lastName email avatar' },
      { path: 'mentions', select: 'firstName lastName email avatar' },
      { path: 'replyTo', populate: { path: 'sender', select: 'firstName lastName avatar' } },
    ]);
  }
  
  /**
   * Get messages with filtering
   */
  async getMessages(
    filters: MessageFilters,
    options: PaginationOptions = {}
  ): Promise<{ messages: IMessage[]; hasMore: boolean }> {
    const { page = 1, limit = 50, before } = options;
    
    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
    };
    
    if (filters.channel) {
      query.channel = filters.channel;
    }
    
    if (filters.recipient) {
      // Get conversation between two users
      query.$or = [
        { sender: new Types.ObjectId(filters.sender), recipient: new Types.ObjectId(filters.recipient) },
        { sender: new Types.ObjectId(filters.recipient), recipient: new Types.ObjectId(filters.sender) },
      ];
    }
    
    if (filters.taskRef) {
      query.taskRef = new Types.ObjectId(filters.taskRef);
    }
    
    if (filters.since) {
      query.createdAt = { $gt: filters.since };
    }
    
    if (before) {
      query.createdAt = { ...(query.createdAt as object || {}), $lt: before };
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('sender', 'firstName lastName email avatar')
      .populate('recipient', 'firstName lastName email avatar')
      .populate('mentions', 'firstName lastName email avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'firstName lastName avatar' },
      });
    
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }
    
    // Return in chronological order for display
    return {
      messages: messages.reverse(),
      hasMore,
    };
  }
  
  /**
   * Get direct message conversations
   */
  async getConversations(userId: string): Promise<{
    user: unknown;
    lastMessage: IMessage;
    unreadCount: number;
  }[]> {
    const userObjectId = new Types.ObjectId(userId);
    
    // Get last message for each conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          $or: [
            { sender: userObjectId },
            { recipient: userObjectId },
          ],
          recipient: { $exists: true },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ['$sender', userObjectId] },
              then: '$recipient',
              else: '$sender',
            },
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$sender', userObjectId] },
                    { $not: { $in: [userObjectId, '$readBy.user'] } },
                  ],
                },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          user: {
            _id: '$user._id',
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            email: '$user.email',
            avatar: '$user.avatar',
            lastSeen: '$user.lastSeen',
          },
          lastMessage: 1,
          unreadCount: 1,
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
    ]);
    
    return conversations;
  }
  
  /**
   * Mark messages as read
   */
  async markAsRead(messageIds: string[], userId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    
    await Message.updateMany(
      {
        _id: { $in: messageIds.map(id => new Types.ObjectId(id)) },
        'readBy.user': { $ne: userObjectId },
      },
      {
        $push: {
          readBy: { user: userObjectId, readAt: new Date() },
        },
      }
    );
  }
  
  /**
   * Mark all messages in a conversation/channel as read
   */
  async markConversationAsRead(
    userId: string,
    options: { channel?: string; recipientId?: string }
  ): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    const query: Record<string, unknown> = {
      'readBy.user': { $ne: userObjectId },
    };
    
    if (options.channel) {
      query.channel = options.channel;
    }
    
    if (options.recipientId) {
      query.$or = [
        { sender: new Types.ObjectId(options.recipientId), recipient: userObjectId },
      ];
    }
    
    await Message.updateMany(query, {
      $push: {
        readBy: { user: userObjectId, readAt: new Date() },
      },
    });
  }
  
  /**
   * Edit message
   */
  async editMessage(messageId: string, content: string, userId: string): Promise<IMessage | null> {
    const message = await Message.findOne({
      _id: new Types.ObjectId(messageId),
      sender: new Types.ObjectId(userId),
      isDeleted: { $ne: true },
    });
    
    if (!message) {
      throw new Error('Message not found or unauthorized');
    }
    
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    
    await message.save();
    
    return message.populate([
      { path: 'sender', select: 'firstName lastName email avatar' },
      { path: 'recipient', select: 'firstName lastName email avatar' },
    ]);
  }
  
  /**
   * Delete message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const result = await Message.updateOne(
      {
        _id: new Types.ObjectId(messageId),
        sender: new Types.ObjectId(userId),
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }
    );
    
    return result.modifiedCount > 0;
  }
  
  /**
   * Add reaction to message
   */
  async addReaction(messageId: string, emoji: string, userId: string): Promise<IMessage | null> {
    const userObjectId = new Types.ObjectId(userId);
    
    // First, try to add user to existing reaction
    const updateResult = await Message.updateOne(
      {
        _id: new Types.ObjectId(messageId),
        'reactions.emoji': emoji,
        'reactions.users': { $ne: userObjectId },
      },
      {
        $push: { 'reactions.$.users': userObjectId },
      }
    );
    
    if (updateResult.modifiedCount === 0) {
      // Reaction doesn't exist, add new one
      await Message.updateOne(
        {
          _id: new Types.ObjectId(messageId),
          'reactions.emoji': { $ne: emoji },
        },
        {
          $push: {
            reactions: { emoji, users: [userObjectId] },
          },
        }
      );
    }
    
    return Message.findById(messageId)
      .populate('sender', 'firstName lastName email avatar');
  }
  
  /**
   * Remove reaction from message
   */
  async removeReaction(messageId: string, emoji: string, userId: string): Promise<IMessage | null> {
    const userObjectId = new Types.ObjectId(userId);
    
    await Message.updateOne(
      {
        _id: new Types.ObjectId(messageId),
        'reactions.emoji': emoji,
      },
      {
        $pull: { 'reactions.$.users': userObjectId },
      }
    );
    
    // Remove empty reactions
    await Message.updateOne(
      { _id: new Types.ObjectId(messageId) },
      { $pull: { reactions: { users: { $size: 0 } } } }
    );
    
    return Message.findById(messageId)
      .populate('sender', 'firstName lastName email avatar');
  }
  
  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<{
    total: number;
    byChannel: Record<string, number>;
    byConversation: Record<string, number>;
  }> {
    const userObjectId = new Types.ObjectId(userId);
    
    const unreadMessages = await Message.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          sender: { $ne: userObjectId },
          $or: [
            { recipient: userObjectId },
            { channel: { $exists: true } },
          ],
          'readBy.user': { $ne: userObjectId },
        },
      },
      {
        $group: {
          _id: {
            channel: '$channel',
            sender: '$sender',
          },
          count: { $sum: 1 },
        },
      },
    ]);
    
    let total = 0;
    const byChannel: Record<string, number> = {};
    const byConversation: Record<string, number> = {};
    
    for (const item of unreadMessages) {
      total += item.count;
      
      if (item._id.channel) {
        byChannel[item._id.channel] = (byChannel[item._id.channel] || 0) + item.count;
      } else if (item._id.sender) {
        byConversation[item._id.sender.toString()] = item.count;
      }
    }
    
    return { total, byChannel, byConversation };
  }
  
  /**
   * Search messages
   */
  async searchMessages(query: string, userId: string, limit: number = 20): Promise<IMessage[]> {
    const userObjectId = new Types.ObjectId(userId);
    
    return Message.find({
      isDeleted: { $ne: true },
      $or: [
        { sender: userObjectId },
        { recipient: userObjectId },
        { channel: { $exists: true } },
      ],
      content: { $regex: query, $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'firstName lastName email avatar')
      .populate('recipient', 'firstName lastName email avatar');
  }
}

export const messageService = new MessageService();
