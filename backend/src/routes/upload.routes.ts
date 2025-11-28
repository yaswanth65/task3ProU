import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/index.js';
import { taskService } from '../services/index.js';

const router = Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // TODO: Production hardening - implement proper file type validation
  // For now, allow common file types
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed',
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
  },
  fileFilter,
});

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/upload
 * Upload a file
 */
router.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      
      const file = req.file;
      const fileUrl = `/uploads/${file.filename}`;
      
      res.status(201).json({
        file: {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: fileUrl,
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

/**
 * POST /api/upload/task/:taskId
 * Upload and attach file to a task
 */
router.post(
  '/task/:taskId',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      
      const file = req.file;
      const fileUrl = `/uploads/${file.filename}`;
      
      const attachment = {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: fileUrl,
      };
      
      const task = await taskService.addAttachment(
        req.params.taskId,
        attachment,
        req.userId!
      );
      
      if (!task) {
        // Clean up uploaded file
        fs.unlinkSync(path.join(uploadDir, file.filename));
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      
      res.status(201).json({ task });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

/**
 * DELETE /api/upload/task/:taskId/attachment/:attachmentId
 * Remove attachment from task
 */
router.delete(
  '/task/:taskId/attachment/:attachmentId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const success = await taskService.removeAttachment(
        req.params.taskId,
        req.params.attachmentId,
        req.userId!
      );
      
      if (!success) {
        res.status(404).json({ error: 'Attachment not found' });
        return;
      }
      
      // TODO: Production hardening - also delete the file from storage
      // For S3, you would delete from S3 here
      
      res.json({ message: 'Attachment removed' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove attachment' });
    }
  }
);

// Error handler for multer
router.use((err: Error, req: Request, res: Response, next: Function) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ 
        error: `File too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB` 
      });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  
  if (err) {
    res.status(400).json({ error: err.message });
    return;
  }
  
  next();
});

export default router;
