import { Task, ITask, TaskStatus, TaskPriority, IActivity, ActivityType } from '../models/index.js';
import mongoose, { Types } from 'mongoose';

interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assignee?: string;
  createdBy?: string;
  tags?: string[];
  search?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  overdue?: boolean;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignees?: string[];
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  tags?: string[];
  parentTask?: string;
}

interface UpdateTaskData extends Partial<CreateTaskData> {
  actualHours?: number;
  order?: number;
}

class TaskService {
  /**
   * Create a new task
   */
  async createTask(data: CreateTaskData, createdById: string): Promise<ITask> {
    const task = new Task({
      ...data,
      createdBy: new Types.ObjectId(createdById),
      assignees: data.assignees?.map(id => new Types.ObjectId(id)) || [],
      parentTask: data.parentTask ? new Types.ObjectId(data.parentTask) : undefined,
      activities: [{
        type: 'created' as ActivityType,
        actor: new Types.ObjectId(createdById),
        description: 'Task created',
        timestamp: new Date(),
      }],
    });
    
    await task.save();
    
    // If this is a subtask, add reference to parent
    if (data.parentTask) {
      await Task.findByIdAndUpdate(data.parentTask, {
        $push: { subtasks: task._id },
      });
    }
    
    return task.populate(['assignees', 'createdBy']);
  }
  
  /**
   * Get tasks with filtering and pagination
   */
  async getTasks(
    filters: TaskFilters = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<ITask>> {
    const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;
    
    // Build query
    const query: Record<string, unknown> = {
      status: { $ne: 'archived' },
    };
    
    if (filters.status) {
      query.status = Array.isArray(filters.status) 
        ? { $in: filters.status }
        : filters.status;
    }
    
    if (filters.priority) {
      query.priority = Array.isArray(filters.priority)
        ? { $in: filters.priority }
        : filters.priority;
    }
    
    if (filters.assignee) {
      query.assignees = new Types.ObjectId(filters.assignee);
    }
    
    if (filters.createdBy) {
      query.createdBy = new Types.ObjectId(filters.createdBy);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }
    
    if (filters.search) {
      query.$text = { $search: filters.search };
    }
    
    if (filters.dueDateFrom || filters.dueDateTo) {
      query.dueDate = {};
      if (filters.dueDateFrom) {
        (query.dueDate as Record<string, Date>).$gte = filters.dueDateFrom;
      }
      if (filters.dueDateTo) {
        (query.dueDate as Record<string, Date>).$lte = filters.dueDateTo;
      }
    }
    
    if (filters.overdue) {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: ['done', 'archived'] };
    }
    
    // Get total count
    const total = await Task.countDocuments(query);
    
    // Get paginated results
    const sortOptions: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const tasks = await Task.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('assignees', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar');
    
    return {
      data: tasks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Get task by ID
   */
  async getTaskById(taskId: string): Promise<ITask | null> {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return null;
    }
    
    return Task.findById(taskId)
      .populate('assignees', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('comments.author', 'firstName lastName email avatar')
      .populate('activities.actor', 'firstName lastName email avatar')
      .populate('attachments.uploadedBy', 'firstName lastName email avatar')
      .populate({
        path: 'subtasks',
        populate: { path: 'assignees', select: 'firstName lastName avatar' },
      })
      .populate('parentTask', 'title status');
  }
  
  /**
   * Update task
   */
  async updateTask(
    taskId: string,
    updates: UpdateTaskData,
    actorId: string
  ): Promise<ITask | null> {
    const task = await Task.findById(taskId);
    if (!task) return null;
    
    const activities: Partial<IActivity>[] = [];
    
    // Track status changes
    if (updates.status && updates.status !== task.status) {
      activities.push({
        type: 'status_changed',
        actor: new Types.ObjectId(actorId),
        description: `Status changed from "${task.status}" to "${updates.status}"`,
        metadata: { from: task.status, to: updates.status },
        timestamp: new Date(),
      });
    }
    
    // Track priority changes
    if (updates.priority && updates.priority !== task.priority) {
      activities.push({
        type: 'priority_changed',
        actor: new Types.ObjectId(actorId),
        description: `Priority changed from "${task.priority}" to "${updates.priority}"`,
        metadata: { from: task.priority, to: updates.priority },
        timestamp: new Date(),
      });
    }
    
    // Track due date changes
    if (updates.dueDate !== undefined) {
      const oldDate = task.dueDate?.toISOString().split('T')[0];
      const newDate = updates.dueDate ? new Date(updates.dueDate).toISOString().split('T')[0] : null;
      
      if (oldDate !== newDate) {
        activities.push({
          type: 'due_date_changed',
          actor: new Types.ObjectId(actorId),
          description: newDate 
            ? `Due date changed to ${newDate}`
            : 'Due date removed',
          metadata: { from: oldDate, to: newDate },
          timestamp: new Date(),
        });
      }
    }
    
    // Track assignee changes
    if (updates.assignees) {
      const oldAssignees = task.assignees.map(a => a.toString()).sort();
      const newAssignees = updates.assignees.sort();
      
      if (JSON.stringify(oldAssignees) !== JSON.stringify(newAssignees)) {
        const added = newAssignees.filter(a => !oldAssignees.includes(a));
        const removed = oldAssignees.filter(a => !newAssignees.includes(a));
        
        if (added.length > 0) {
          activities.push({
            type: 'assigned',
            actor: new Types.ObjectId(actorId),
            description: 'Assignees added',
            metadata: { added },
            timestamp: new Date(),
          });
        }
        
        if (removed.length > 0) {
          activities.push({
            type: 'unassigned',
            actor: new Types.ObjectId(actorId),
            description: 'Assignees removed',
            metadata: { removed },
            timestamp: new Date(),
          });
        }
      }
    }
    
    // General update activity
    if (activities.length === 0 && Object.keys(updates).length > 0) {
      activities.push({
        type: 'updated',
        actor: new Types.ObjectId(actorId),
        description: 'Task updated',
        metadata: { fields: Object.keys(updates) },
        timestamp: new Date(),
      });
    }
    
    // Apply updates
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.assignees) {
      updateData.assignees = updates.assignees.map(id => new Types.ObjectId(id));
    }
    
    // Add activities
    if (activities.length > 0) {
      updateData.$push = { activities: { $each: activities } };
    }
    
    return Task.findByIdAndUpdate(taskId, updateData, { new: true, runValidators: true })
      .populate('assignees', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email avatar');
  }
  
  /**
   * Delete task
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const result = await Task.findByIdAndDelete(taskId);
    return !!result;
  }
  
  /**
   * Add comment to task
   */
  async addComment(
    taskId: string,
    content: string,
    authorId: string,
    mentions: string[] = []
  ): Promise<ITask | null> {
    const comment = {
      content,
      author: new Types.ObjectId(authorId),
      mentions: mentions.map(id => new Types.ObjectId(id)),
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false,
    };
    
    const activity = {
      type: 'comment_added' as ActivityType,
      actor: new Types.ObjectId(authorId),
      description: 'Added a comment',
      timestamp: new Date(),
    };
    
    return Task.findByIdAndUpdate(
      taskId,
      {
        $push: {
          comments: comment,
          activities: activity,
        },
      },
      { new: true }
    )
      .populate('comments.author', 'firstName lastName email avatar')
      .populate('activities.actor', 'firstName lastName email avatar');
  }
  
  /**
   * Update comment
   */
  async updateComment(
    taskId: string,
    commentId: string,
    content: string,
    userId: string
  ): Promise<ITask | null> {
    const task = await Task.findById(taskId);
    if (!task) return null;
    
    const comment = task.comments.find(c => c._id.toString() === commentId);
    if (!comment || comment.author.toString() !== userId) {
      throw new Error('Comment not found or unauthorized');
    }
    
    return Task.findOneAndUpdate(
      { _id: taskId, 'comments._id': commentId },
      {
        $set: {
          'comments.$.content': content,
          'comments.$.updatedAt': new Date(),
          'comments.$.isEdited': true,
        },
      },
      { new: true }
    ).populate('comments.author', 'firstName lastName email avatar');
  }
  
  /**
   * Delete comment
   */
  async deleteComment(taskId: string, commentId: string, userId: string): Promise<boolean> {
    const task = await Task.findById(taskId);
    if (!task) return false;
    
    const comment = task.comments.find(c => c._id.toString() === commentId);
    if (!comment || comment.author.toString() !== userId) {
      return false;
    }
    
    await Task.findByIdAndUpdate(taskId, {
      $pull: { comments: { _id: commentId } },
    });
    
    return true;
  }
  
  /**
   * Add attachment to task
   */
  async addAttachment(
    taskId: string,
    attachment: {
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      path: string;
    },
    uploadedById: string
  ): Promise<ITask | null> {
    const attachmentData = {
      ...attachment,
      uploadedBy: new Types.ObjectId(uploadedById),
      uploadedAt: new Date(),
    };
    
    const activity = {
      type: 'attachment_added' as ActivityType,
      actor: new Types.ObjectId(uploadedById),
      description: `Added attachment: ${attachment.originalName}`,
      timestamp: new Date(),
    };
    
    return Task.findByIdAndUpdate(
      taskId,
      {
        $push: {
          attachments: attachmentData,
          activities: activity,
        },
      },
      { new: true }
    ).populate('attachments.uploadedBy', 'firstName lastName email avatar');
  }
  
  /**
   * Remove attachment from task
   */
  async removeAttachment(taskId: string, attachmentId: string, userId: string): Promise<boolean> {
    const task = await Task.findById(taskId);
    if (!task) return false;
    
    const attachment = task.attachments.find(a => a._id.toString() === attachmentId);
    if (!attachment) return false;
    
    const activity = {
      type: 'attachment_removed' as ActivityType,
      actor: new Types.ObjectId(userId),
      description: `Removed attachment: ${attachment.originalName}`,
      timestamp: new Date(),
    };
    
    await Task.findByIdAndUpdate(taskId, {
      $pull: { attachments: { _id: attachmentId } },
      $push: { activities: activity },
    });
    
    return true;
  }
  
  /**
   * Get tasks for calendar view
   */
  async getCalendarTasks(
    startDate: Date,
    endDate: Date,
    userId?: string,
    isManager: boolean = false
  ): Promise<ITask[]> {
    const query: Record<string, unknown> = {
      status: { $ne: 'archived' },
      $or: [
        {
          dueDate: { $gte: startDate, $lte: endDate },
        },
        {
          startDate: { $gte: startDate, $lte: endDate },
        },
        {
          $and: [
            { startDate: { $lte: startDate } },
            { dueDate: { $gte: endDate } },
          ],
        },
      ],
    };
    
    // Non-managers only see their assigned tasks
    if (!isManager && userId) {
      query.assignees = new Types.ObjectId(userId);
    }
    
    return Task.find(query)
      .populate('assignees', 'firstName lastName avatar')
      .sort({ dueDate: 1 });
  }
  
  /**
   * Get task statistics
   */
  async getTaskStats(userId?: string, isManager: boolean = false): Promise<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
    overdue: number;
    completedThisWeek: number;
    completedThisMonth: number;
  }> {
    const matchStage: Record<string, unknown> = {
      status: { $ne: 'archived' },
    };
    
    if (!isManager && userId) {
      matchStage.assignees = new Types.ObjectId(userId);
    }
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const [statusStats, priorityStats, overdue, completedThisWeek, completedThisMonth] = await Promise.all([
      Task.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: matchStage },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Task.countDocuments({
        ...matchStage,
        dueDate: { $lt: now },
        status: { $nin: ['done', 'archived'] },
      }),
      Task.countDocuments({
        ...matchStage,
        status: 'done',
        completedAt: { $gte: weekAgo },
      }),
      Task.countDocuments({
        ...matchStage,
        status: 'done',
        completedAt: { $gte: monthAgo },
      }),
    ]);
    
    const byStatus: Record<string, number> = {};
    for (const stat of statusStats) {
      byStatus[stat._id] = stat.count;
    }
    
    const byPriority: Record<string, number> = {};
    for (const stat of priorityStats) {
      byPriority[stat._id] = stat.count;
    }
    
    const total = statusStats.reduce((sum, stat) => sum + stat.count, 0);
    
    return {
      total,
      byStatus: byStatus as Record<TaskStatus, number>,
      byPriority: byPriority as Record<TaskPriority, number>,
      overdue,
      completedThisWeek,
      completedThisMonth,
    };
  }
  
  /**
   * Get unique tags
   */
  async getTags(): Promise<string[]> {
    const tags = await Task.distinct('tags', { status: { $ne: 'archived' } });
    return tags.filter(Boolean).sort();
  }
  
  /**
   * Bulk update task status (for Kanban drag-drop)
   */
  async bulkUpdateStatus(
    taskIds: string[],
    status: TaskStatus,
    actorId: string
  ): Promise<number> {
    const result = await Task.updateMany(
      { _id: { $in: taskIds.map(id => new Types.ObjectId(id)) } },
      {
        $set: { status },
        $push: {
          activities: {
            type: 'status_changed',
            actor: new Types.ObjectId(actorId),
            description: `Status changed to "${status}"`,
            timestamp: new Date(),
          },
        },
      }
    );
    
    return result.modifiedCount;
  }
  
  /**
   * Reorder tasks within a status column
   */
  async reorderTasks(orderedTaskIds: string[]): Promise<void> {
    const bulkOps = orderedTaskIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id) },
        update: { $set: { order: index } },
      },
    }));
    
    await Task.bulkWrite(bulkOps);
  }
  
  /**
   * Get workload data for heatmap
   */
  async getWorkloadHeatmap(startDate: Date, endDate: Date): Promise<{
    date: string;
    count: number;
    tasksCompleted: number;
    tasksCreated: number;
  }[]> {
    const [completedByDate, createdByDate] = await Promise.all([
      Task.aggregate([
        {
          $match: {
            completedAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      Task.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);
    
    // Merge results
    const dateMap = new Map<string, { completed: number; created: number }>();
    
    for (const item of completedByDate) {
      const existing = dateMap.get(item._id) || { completed: 0, created: 0 };
      existing.completed = item.count;
      dateMap.set(item._id, existing);
    }
    
    for (const item of createdByDate) {
      const existing = dateMap.get(item._id) || { completed: 0, created: 0 };
      existing.created = item.count;
      dateMap.set(item._id, existing);
    }
    
    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.completed + data.created,
        tasksCompleted: data.completed,
        tasksCreated: data.created,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const taskService = new TaskService();
