import { Router, Request, Response } from 'express';
import { query, param, body } from 'express-validator';
import { userService } from '../services/index.js';
import { authenticate, managerOnly, validate } from '../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/users
 * Get all users (with optional filters)
 */
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['manager', 'user']),
    query('department').optional().trim(),
    query('search').optional().trim(),
    query('isActive').optional().isBoolean(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        role: req.query.role as string,
        department: req.query.department as string,
        search: req.query.search as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      };
      
      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: (req.query.sortBy as string) || 'firstName',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
      };
      
      const result = await userService.getUsers(filters, options);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get users' });
    }
  }
);

/**
 * GET /api/users/search
 * Search users for mentions/assignments
 */
router.get(
  '/search',
  validate([
    query('q').trim().notEmpty().withMessage('Search query is required'),
    query('limit').optional().isInt({ min: 1, max: 20 }),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const users = await userService.searchUsers(query, limit);
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Search failed' });
    }
  }
);

/**
 * GET /api/users/departments
 * Get unique departments
 */
router.get('/departments', async (req: Request, res: Response): Promise<void> => {
  try {
    const departments = await userService.getDepartments();
    res.json({ departments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get departments' });
  }
});

/**
 * GET /api/users/stats
 * Get user statistics (manager only)
 */
router.get('/stats', managerOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await userService.getUserStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/users/team
 * Get team members
 */
router.get('/team', async (req: Request, res: Response): Promise<void> => {
  try {
    const team = await userService.getTeamMembers(req.userId!);
    res.json({ team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get team' });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get(
  '/:id',
  validate([
    param('id').isMongoId().withMessage('Invalid user ID'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await userService.getUserById(req.params.id);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user' });
    }
  }
);

/**
 * PATCH /api/users/:id
 * Update user (manager only)
 */
router.patch(
  '/:id',
  managerOnly,
  validate([
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('role').optional().isIn(['manager', 'user']),
    body('department').optional().trim(),
    body('position').optional().trim(),
    body('isActive').optional().isBoolean(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await userService.updateUser(req.params.id, req.body, req.userId!);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      res.json({ user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      res.status(400).json({ error: message });
    }
  }
);

export default router;
