import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { authService } from '../services/index.js';
import { validate } from '../middleware/index.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('role').optional().isIn(['manager', 'user']).withMessage('Invalid role'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName, role, department, position } = req.body;
      // Log incoming register attempts in dev for easier debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log('Register attempt:', { email, firstName, lastName, role, department, position });
      }

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        role,
        department,
        position,
      });
      
      // Set cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      res.status(201).json(result);
    } catch (error) {
      // Log full error for debugging
      console.error('Registration error:', error);

      const message = error instanceof Error ? error.message : 'Registration failed';

      // Map common error types to appropriate status codes
      let status = 500;
      if (message.includes('Email already registered') || message.includes('Validation failed') || message.includes('required')) {
        status = 400;
      }

      const payload: any = { error: message };
      if (process.env.NODE_ENV !== 'production' && error instanceof Error) payload.stack = error.stack;

      res.status(status).json(payload);
    }
  }
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      
      const result = await authService.login({ email, password });
      
      // Set cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      res.json(result);
    } catch (error) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'Login failed';

      const payload: any = { error: message };
      if (process.env.NODE_ENV !== 'production' && error instanceof Error) payload.stack = error.stack;

      res.status(401).json(payload);
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', (req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * PATCH /api/auth/profile
 * Update current user profile
 */
router.patch(
  '/profile',
  authenticate,
  validate([
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('timezone').optional().trim(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updates = req.body;
      const user = await authService.updateProfile(req.userId!, updates);
      
      res.json({ user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * POST /api/auth/change-password
 * Change password
 */
router.post(
  '/change-password',
  authenticate,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      await authService.changePassword(req.userId!, currentPassword, newPassword);
      
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh token
 */
router.post('/refresh', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const token = await authService.refreshToken(req.userId!);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    res.json({ token });
  } catch (error) {
    res.status(401).json({ error: 'Failed to refresh token' });
  }
});

/**
 * POST /api/auth/complete-onboarding
 * Mark onboarding as completed
 */
router.post('/complete-onboarding', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await authService.updateProfile(req.userId!, { onboardingCompleted: true });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;
