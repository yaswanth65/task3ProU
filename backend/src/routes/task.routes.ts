import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { taskService } from '../services/index.js';
import { authenticate, validate } from '../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/tasks
 * Get tasks with filtering and pagination
 */
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional(),
    query('priority').optional(),
    query('assignee').optional().isMongoId(),
    query('tags').optional(),
    query('search').optional().trim(),
    query('dueDateFrom').optional().isISO8601(),
    query('dueDateTo').optional().isISO8601(),
    query('overdue').optional().isBoolean(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        priority: req.query.priority as string | undefined,
        assignee: req.query.assignee as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search: req.query.search as string,
        dueDateFrom: req.query.dueDateFrom ? new Date(req.query.dueDateFrom as string) : undefined,
        dueDateTo: req.query.dueDateTo ? new Date(req.query.dueDateTo as string) : undefined,
        overdue: req.query.overdue === 'true',
      };
      
      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };
      
      const result = await taskService.getTasks(filters as Parameters<typeof taskService.getTasks>[0], options);
      res.json(result);
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({ error: 'Failed to get tasks' });
    }
  }
);

/**
 * GET /api/tasks/my
 * Get current user's tasks
 */
router.get('/my', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await taskService.getTasks(
      { assignee: req.userId },
      { sortBy: 'dueDate', sortOrder: 'asc' }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

/**
 * GET /api/tasks/calendar
 * Get tasks for calendar view
 */
router.get(
  '/calendar',
  validate([
    query('startDate').isISO8601().withMessage('Start date is required'),
    query('endDate').isISO8601().withMessage('End date is required'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const isManager = req.user?.role === 'manager';
      
      const tasks = await taskService.getCalendarTasks(
        startDate,
        endDate,
        req.userId,
        isManager
      );
      
      res.json({ tasks });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get calendar tasks' });
    }
  }
);

/**
 * GET /api/tasks/stats
 * Get task statistics
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const isManager = req.user?.role === 'manager';
    const stats = await taskService.getTaskStats(req.userId, isManager);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/tasks/tags
 * Get unique tags
 */
router.get('/tags', async (req: Request, res: Response): Promise<void> => {
  try {
    const tags = await taskService.getTags();
    res.json({ tags });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

/**
 * GET /api/tasks/workload-heatmap
 * Get workload heatmap data
 */
router.get(
  '/workload-heatmap',
  validate([
    query('startDate').isISO8601().withMessage('Start date is required'),
    query('endDate').isISO8601().withMessage('End date is required'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      const heatmapData = await taskService.getWorkloadHeatmap(startDate, endDate);
      res.json({ data: heatmapData });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get heatmap data' });
    }
  }
);

/**
 * POST /api/tasks
 * Create a new task
 */
router.post(
  '/',
  validate([
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 10000 }),
    body('status').optional().isIn(['backlog', 'todo', 'in_progress', 'in_review', 'done']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('assignees').optional().isArray(),
    body('assignees.*').optional().isMongoId(),
    body('dueDate').optional().isISO8601(),
    body('startDate').optional().isISO8601(),
    body('estimatedHours').optional().isFloat({ min: 0, max: 1000 }),
    body('tags').optional().isArray(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const task = await taskService.createTask(req.body, req.userId!);
      
      // Emit socket event for real-time updates
      const io = req.app.get('io');
      io.emit('task:created', task);
      
      res.status(201).json({ task });
    } catch (error) {
      console.error('Create task error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create task';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * GET /api/tasks/:id
 * Get task by ID
 */
router.get(
  '/:id',
  validate([
    param('id').isMongoId().withMessage('Invalid task ID'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const task = await taskService.getTaskById(req.params.id);
      
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      
      res.json({ task });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get task' });
    }
  }
);

/**
 * PATCH /api/tasks/:id
 * Update task
 */
router.patch(
  '/:id',
  validate([
    param('id').isMongoId().withMessage('Invalid task ID'),
    body('title').optional().trim().notEmpty().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 10000 }),
    body('status').optional().isIn(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'archived']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('assignees').optional().isArray(),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('startDate').optional({ nullable: true }).isISO8601(),
    body('estimatedHours').optional().isFloat({ min: 0, max: 1000 }),
    body('actualHours').optional().isFloat({ min: 0, max: 1000 }),
    body('tags').optional().isArray(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const task = await taskService.updateTask(req.params.id, req.body, req.userId!);
      
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      
      // Emit socket event for real-time updates
      const io = req.app.get('io');
      io.emit('task:updated', task);
      
      res.json({ task });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update task';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * DELETE /api/tasks/:id
 * Delete task
 */
router.delete(
  '/:id',
  validate([
    param('id').isMongoId().withMessage('Invalid task ID'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const success = await taskService.deleteTask(req.params.id);
      
      if (!success) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      
      // Emit socket event
      const io = req.app.get('io');
      io.emit('task:deleted', { taskId: req.params.id });
      
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  }
);

/**
 * POST /api/tasks/:id/comments
 * Add comment to task
 */
router.post(
  '/:id/comments',
  validate([
    param('id').isMongoId().withMessage('Invalid task ID'),
    body('content').trim().notEmpty().withMessage('Comment content is required').isLength({ max: 5000 }),
    body('mentions').optional().isArray(),
    body('mentions.*').optional().isMongoId(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { content, mentions } = req.body;
      const task = await taskService.addComment(req.params.id, content, req.userId!, mentions);
      
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      
      // Emit socket event
      const io = req.app.get('io');
      io.emit('task:comment', { taskId: req.params.id, task });
      
      res.status(201).json({ task });
    } catch (error) {
      res.status(400).json({ error: 'Failed to add comment' });
    }
  }
);

/**
 * PATCH /api/tasks/:id/comments/:commentId
 * Update comment
 */
router.patch(
  '/:id/comments/:commentId',
  validate([
    param('id').isMongoId(),
    param('commentId').isMongoId(),
    body('content').trim().notEmpty().isLength({ max: 5000 }),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const task = await taskService.updateComment(
        req.params.id,
        req.params.commentId,
        req.body.content,
        req.userId!
      );
      
      res.json({ task });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update comment';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * DELETE /api/tasks/:id/comments/:commentId
 * Delete comment
 */
router.delete(
  '/:id/comments/:commentId',
  validate([
    param('id').isMongoId(),
    param('commentId').isMongoId(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const success = await taskService.deleteComment(
        req.params.id,
        req.params.commentId,
        req.userId!
      );
      
      if (!success) {
        res.status(404).json({ error: 'Comment not found or unauthorized' });
        return;
      }
      
      res.json({ message: 'Comment deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  }
);

/**
 * POST /api/tasks/bulk-status
 * Bulk update task status
 */
router.post(
  '/bulk-status',
  validate([
    body('taskIds').isArray({ min: 1 }).withMessage('Task IDs required'),
    body('taskIds.*').isMongoId(),
    body('status').isIn(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'archived']),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskIds, status } = req.body;
      const count = await taskService.bulkUpdateStatus(taskIds, status, req.userId!);
      
      // Emit socket event
      const io = req.app.get('io');
      io.emit('tasks:bulk-updated', { taskIds, status });
      
      res.json({ message: `Updated ${count} tasks`, count });
    } catch (error) {
      res.status(400).json({ error: 'Bulk update failed' });
    }
  }
);

/**
 * POST /api/tasks/reorder
 * Reorder tasks within a column
 */
router.post(
  '/reorder',
  validate([
    body('taskIds').isArray({ min: 1 }),
    body('taskIds.*').isMongoId(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await taskService.reorderTasks(req.body.taskIds);
      res.json({ message: 'Tasks reordered' });
    } catch (error) {
      res.status(400).json({ error: 'Reorder failed' });
    }
  }
);

export default router;
