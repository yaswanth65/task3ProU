import mongoose, { Document, Schema, Types } from 'mongoose';

// Task priority levels
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Task status
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'archived';

// Activity types for audit trail
export type ActivityType = 
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'priority_changed'
  | 'due_date_changed'
  | 'comment_added'
  | 'attachment_added'
  | 'attachment_removed'
  | 'tag_added'
  | 'tag_removed';

export interface IAttachment {
  _id: Types.ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

export interface IComment {
  _id: Types.ObjectId;
  content: string;
  author: Types.ObjectId;
  mentions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
}

export interface IActivity {
  _id: Types.ObjectId;
  type: ActivityType;
  actor: Types.ObjectId;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: Types.ObjectId[];
  createdBy: Types.ObjectId;
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  attachments: IAttachment[];
  comments: IComment[];
  activities: IActivity[];
  parentTask?: Types.ObjectId;
  subtasks: Types.ObjectId[];
  dependencies: Types.ObjectId[];
  completedAt?: Date;
  order: number;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const commentSchema = new Schema<IComment>(
  {
    content: { type: String, required: true, maxlength: 5000 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isEdited: { type: Boolean, default: false },
  },
  { timestamps: true, _id: true }
);

const activitySchema = new Schema<IActivity>(
  {
    type: {
      type: String,
      enum: [
        'created', 'updated', 'status_changed', 'assigned', 'unassigned',
        'priority_changed', 'due_date_changed', 'comment_added',
        'attachment_added', 'attachment_removed', 'tag_added', 'tag_removed',
      ],
      required: true,
    },
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [10000, 'Description cannot exceed 10000 characters'],
    },
    status: {
      type: String,
      enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'archived'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignees: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
    },
    startDate: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: 0,
      max: 1000,
    },
    actualHours: {
      type: Number,
      min: 0,
      max: 1000,
      default: 0,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    attachments: [attachmentSchema],
    comments: [commentSchema],
    activities: [activitySchema],
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    subtasks: [{
      type: Schema.Types.ObjectId,
      ref: 'Task',
    }],
    dependencies: [{
      type: Schema.Types.ObjectId,
      ref: 'Task',
    }],
    completedAt: {
      type: Date,
    },
    order: {
      type: Number,
      default: 0,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPattern: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
      },
      interval: {
        type: Number,
        min: 1,
        max: 365,
      },
      endDate: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-set completedAt when status changes to done
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'done' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'done') {
      this.completedAt = undefined;
    }
  }
  next();
});

// Indexes for efficient querying
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ 'activities.timestamp': -1 });

// Text search index
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const Task = mongoose.model<ITask>('Task', taskSchema);
