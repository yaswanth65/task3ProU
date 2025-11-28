import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  content: string;
  sender: Types.ObjectId;
  recipient?: Types.ObjectId; // For direct messages
  channel?: string; // For channel messages (e.g., 'general', 'task-123')
  taskRef?: Types.ObjectId; // Reference to a task if message is task-related
  mentions: Types.ObjectId[];
  attachments: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
  }[];
  readBy: {
    user: Types.ObjectId;
    readAt: Date;
  }[];
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  replyTo?: Types.ObjectId;
  reactions: {
    emoji: string;
    users: Types.ObjectId[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    channel: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    taskRef: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    mentions: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    attachments: [{
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true },
      path: { type: String, required: true },
    }],
    readBy: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      readAt: { type: Date, default: Date.now },
    }],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    reactions: [{
      emoji: { type: String, required: true },
      users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ taskRef: 1, createdAt: -1 });
messageSchema.index({ mentions: 1 });
messageSchema.index({ createdAt: -1 });

// Compound index for direct messages
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
