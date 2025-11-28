import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { messageService } from '../services/index.js';
import { authenticate, validate } from '../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/messages/conversations
 * Get direct message conversations
 */
router.get('/conversations', async (req: Request, res: Response): Promise<void> => {
  try {
    const conversations = await messageService.getConversations(req.userId!);
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

/**
 * GET /api/messages/unread
 * Get unread message count
 */
router.get('/unread', async (req: Request, res: Response): Promise<void> => {
  try {
    const unread = await messageService.getUnreadCount(req.userId!);
    res.json(unread);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

/**
 * GET /api/messages/channel/:channel
 * Get messages from a channel
 */
router.get(
  '/channel/:channel',
  validate([
    param('channel').trim().notEmpty(),
    query('before').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const options = {
        before: req.query.before ? new Date(req.query.before as string) : undefined,
        limit: parseInt(req.query.limit as string) || 50,
      };
      
      const result = await messageService.getMessages(
        { channel: req.params.channel },
        options
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }
);

/**
 * GET /api/messages/dm/:userId
 * Get direct messages with a user
 */
router.get(
  '/dm/:userId',
  validate([
    param('userId').isMongoId(),
    query('before').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const options = {
        before: req.query.before ? new Date(req.query.before as string) : undefined,
        limit: parseInt(req.query.limit as string) || 50,
      };
      
      const result = await messageService.getMessages(
        { sender: req.userId!, recipient: req.params.userId },
        options
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }
);

/**
 * GET /api/messages/task/:taskId
 * Get messages related to a task
 */
router.get(
  '/task/:taskId',
  validate([
    param('taskId').isMongoId(),
    query('before').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const options = {
        before: req.query.before ? new Date(req.query.before as string) : undefined,
        limit: parseInt(req.query.limit as string) || 50,
      };
      
      const result = await messageService.getMessages(
        { taskRef: req.params.taskId },
        options
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }
);

/**
 * POST /api/messages
 * Send a new message
 */
router.post(
  '/',
  validate([
    body('content').trim().notEmpty().withMessage('Message content is required').isLength({ max: 5000 }),
    body('recipient').optional().isMongoId(),
    body('channel').optional().trim(),
    body('taskRef').optional().isMongoId(),
    body('mentions').optional().isArray(),
    body('mentions.*').optional().isMongoId(),
    body('replyTo').optional().isMongoId(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate that either recipient or channel is provided
      if (!req.body.recipient && !req.body.channel) {
        res.status(400).json({ error: 'Either recipient or channel is required' });
        return;
      }
      
      const message = await messageService.sendMessage(req.body, req.userId!);
      
      // Emit socket event for real-time updates
      const io = req.app.get('io');
      
      if (req.body.channel) {
        io.to(`channel:${req.body.channel}`).emit('message:new', message);
      } else if (req.body.recipient) {
        io.to(`user:${req.body.recipient}`).emit('message:new', message);
        io.to(`user:${req.userId}`).emit('message:new', message);
      }
      
      // Notify mentioned users
      if (req.body.mentions?.length > 0) {
        for (const userId of req.body.mentions) {
          io.to(`user:${userId}`).emit('mention:new', {
            message,
            mentionedBy: req.user,
          });
        }
      }
      
      res.status(201).json({ message });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(400).json({ error: 'Failed to send message' });
    }
  }
);

/**
 * POST /api/messages/read
 * Mark messages as read
 */
router.post(
  '/read',
  validate([
    body('messageIds').isArray({ min: 1 }),
    body('messageIds.*').isMongoId(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await messageService.markAsRead(req.body.messageIds, req.userId!);
      res.json({ message: 'Messages marked as read' });
    } catch (error) {
      res.status(400).json({ error: 'Failed to mark as read' });
    }
  }
);

/**
 * POST /api/messages/read-conversation
 * Mark all messages in a conversation as read
 */
router.post(
  '/read-conversation',
  validate([
    body('channel').optional().trim(),
    body('recipientId').optional().isMongoId(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await messageService.markConversationAsRead(req.userId!, {
        channel: req.body.channel,
        recipientId: req.body.recipientId,
      });
      res.json({ message: 'Conversation marked as read' });
    } catch (error) {
      res.status(400).json({ error: 'Failed to mark conversation as read' });
    }
  }
);

/**
 * PATCH /api/messages/:id
 * Edit a message
 */
router.patch(
  '/:id',
  validate([
    param('id').isMongoId(),
    body('content').trim().notEmpty().isLength({ max: 5000 }),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const message = await messageService.editMessage(
        req.params.id,
        req.body.content,
        req.userId!
      );
      
      // Emit socket event
      const io = req.app.get('io');
      io.emit('message:edited', message);
      
      res.json({ message });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to edit message';
      res.status(400).json({ error: msg });
    }
  }
);

/**
 * DELETE /api/messages/:id
 * Delete a message
 */
router.delete(
  '/:id',
  validate([
    param('id').isMongoId(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const success = await messageService.deleteMessage(req.params.id, req.userId!);
      
      if (!success) {
        res.status(404).json({ error: 'Message not found or unauthorized' });
        return;
      }
      
      // Emit socket event
      const io = req.app.get('io');
      io.emit('message:deleted', { messageId: req.params.id });
      
      res.json({ message: 'Message deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete message' });
    }
  }
);

/**
 * POST /api/messages/:id/reactions
 * Add reaction to message
 */
router.post(
  '/:id/reactions',
  validate([
    param('id').isMongoId(),
    body('emoji').trim().notEmpty(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const message = await messageService.addReaction(
        req.params.id,
        req.body.emoji,
        req.userId!
      );
      
      // Emit socket event
      const io = req.app.get('io');
      io.emit('message:reaction', message);
      
      res.json({ message });
    } catch (error) {
      res.status(400).json({ error: 'Failed to add reaction' });
    }
  }
);

/**
 * DELETE /api/messages/:id/reactions/:emoji
 * Remove reaction from message
 */
router.delete(
  '/:id/reactions/:emoji',
  validate([
    param('id').isMongoId(),
    param('emoji').trim().notEmpty(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const message = await messageService.removeReaction(
        req.params.id,
        req.params.emoji,
        req.userId!
      );
      
      // Emit socket event
      const io = req.app.get('io');
      io.emit('message:reaction', message);
      
      res.json({ message });
    } catch (error) {
      res.status(400).json({ error: 'Failed to remove reaction' });
    }
  }
);

/**
 * GET /api/messages/search
 * Search messages
 */
router.get(
  '/search',
  validate([
    query('q').trim().notEmpty().withMessage('Search query required'),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const messages = await messageService.searchMessages(
        req.query.q as string,
        req.userId!,
        parseInt(req.query.limit as string) || 20
      );
      
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ error: 'Search failed' });
    }
  }
);

export default router;
