import express from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getComments, createComment } from '../controllers/commentController';

const router = Router();
router.use(authenticate);

router.get('/tasks/:taskId/comments', getComments);
router.post('/tasks/:taskId/comments', createComment);

export default router;
