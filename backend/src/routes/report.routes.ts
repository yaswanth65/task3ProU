import { Router, Request, Response } from 'express';
import { query } from 'express-validator';
import { Task } from '../models/index.js';
import { authenticate, managerOnly, validate } from '../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/reports/tasks
 * Export tasks as CSV
 */
router.get(
  '/tasks',
  validate([
    query('format').optional().isIn(['csv', 'json']),
    query('status').optional(),
    query('priority').optional(),
    query('assignee').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const format = (req.query.format as string) || 'csv';
      const isManager = req.user?.role === 'manager';
      
      // Build query
      const query: Record<string, unknown> = {
        status: { $ne: 'archived' },
      };
      
      if (req.query.status) {
        query.status = req.query.status;
      }
      
      if (req.query.priority) {
        query.priority = req.query.priority;
      }
      
      if (req.query.assignee) {
        query.assignees = req.query.assignee;
      } else if (!isManager) {
        // Non-managers can only export their own tasks
        query.assignees = req.userId;
      }
      
      if (req.query.startDate) {
        query.createdAt = { $gte: new Date(req.query.startDate as string) };
      }
      
      if (req.query.endDate) {
        query.createdAt = {
          ...(query.createdAt as object || {}),
          $lte: new Date(req.query.endDate as string),
        };
      }
      
      const tasks = await Task.find(query)
        .populate('assignees', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean();
      
      if (format === 'csv') {
        // Generate CSV
        const headers = [
          'ID',
          'Title',
          'Status',
          'Priority',
          'Assignees',
          'Created By',
          'Due Date',
          'Created At',
          'Completed At',
          'Tags',
          'Estimated Hours',
          'Actual Hours',
        ];
        
        const rows = tasks.map(task => [
          task._id.toString(),
          `"${(task.title || '').replace(/"/g, '""')}"`,
          task.status,
          task.priority,
          `"${(task.assignees as unknown as Array<{ firstName: string; lastName: string }>)
            .map((a) => `${a.firstName} ${a.lastName}`)
            .join(', ')}"`,
          `"${(task.createdBy as unknown as { firstName: string; lastName: string })?.firstName || ''} ${(task.createdBy as unknown as { firstName: string; lastName: string })?.lastName || ''}"`,
          task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
          new Date(task.createdAt).toISOString(),
          task.completedAt ? new Date(task.completedAt).toISOString() : '',
          `"${(task.tags || []).join(', ')}"`,
          task.estimatedHours || '',
          task.actualHours || '',
        ]);
        
        const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="tasks-export-${Date.now()}.csv"`);
        res.send(csv);
      } else {
        res.json({ tasks });
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: 'Export failed' });
    }
  }
);

/**
 * GET /api/reports/team-workload
 * Get team workload report (manager only)
 */
router.get('/team-workload', managerOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const workload = await Task.aggregate([
      {
        $match: {
          status: { $nin: ['done', 'archived'] },
        },
      },
      {
        $unwind: '$assignees',
      },
      {
        $group: {
          _id: '$assignees',
          taskCount: { $sum: 1 },
          urgentCount: {
            $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] },
          },
          highCount: {
            $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] },
          },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$dueDate', null] },
                    { $lt: ['$dueDate', new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalEstimatedHours: { $sum: { $ifNull: ['$estimatedHours', 0] } },
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
          _id: 1,
          user: {
            _id: '$user._id',
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            email: '$user.email',
            avatar: '$user.avatar',
            department: '$user.department',
          },
          taskCount: 1,
          urgentCount: 1,
          highCount: 1,
          overdueCount: 1,
          totalEstimatedHours: 1,
        },
      },
      {
        $sort: { taskCount: -1 },
      },
    ]);
    
    res.json({ workload });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get workload report' });
  }
});

/**
 * GET /api/reports/productivity
 * Get productivity trends
 */
router.get(
  '/productivity',
  validate([
    query('period').optional().isIn(['week', 'month', 'quarter']),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const period = (req.query.period as string) || 'month';
      const isManager = req.user?.role === 'manager';
      
      let startDate: Date;
      const now = new Date();
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      const matchStage: Record<string, unknown> = {};
      if (!isManager) {
        matchStage.assignees = req.userId;
      }
      
      const [completedByDay, createdByDay, statusDistribution] = await Promise.all([
        // Tasks completed by day
        Task.aggregate([
          {
            $match: {
              ...matchStage,
              completedAt: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$completedAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        
        // Tasks created by day
        Task.aggregate([
          {
            $match: {
              ...matchStage,
              createdAt: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        
        // Current status distribution
        Task.aggregate([
          {
            $match: {
              ...matchStage,
              status: { $ne: 'archived' },
            },
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);
      
      res.json({
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        completedByDay: completedByDay.map(d => ({ date: d._id, count: d.count })),
        createdByDay: createdByDay.map(d => ({ date: d._id, count: d.count })),
        statusDistribution: Object.fromEntries(
          statusDistribution.map(s => [s._id, s.count])
        ),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get productivity report' });
    }
  }
);

/**
 * GET /api/reports/summary
 * Get summary dashboard data
 */
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const isManager = req.user?.role === 'manager';
    const matchStage: Record<string, unknown> = { status: { $ne: 'archived' } };
    
    if (!isManager) {
      matchStage.assignees = req.userId;
    }
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const [
      totalTasks,
      activeTasks,
      completedThisWeek,
      completedThisMonth,
      overdueTasks,
      byPriority,
      byStatus,
    ] = await Promise.all([
      Task.countDocuments(matchStage),
      Task.countDocuments({ ...matchStage, status: { $nin: ['done', 'archived'] } }),
      Task.countDocuments({ ...matchStage, status: 'done', completedAt: { $gte: weekAgo } }),
      Task.countDocuments({ ...matchStage, status: 'done', completedAt: { $gte: monthAgo } }),
      Task.countDocuments({
        ...matchStage,
        status: { $nin: ['done', 'archived'] },
        dueDate: { $lt: now },
      }),
      Task.aggregate([
        { $match: matchStage },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);
    
    res.json({
      totalTasks,
      activeTasks,
      completedThisWeek,
      completedThisMonth,
      overdueTasks,
      byPriority: Object.fromEntries(byPriority.map(p => [p._id, p.count])),
      byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
      completionRate: totalTasks > 0 
        ? Math.round((completedThisMonth / totalTasks) * 100) 
        : 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

export default router;
