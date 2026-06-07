import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getNotifications, markAsRead } from '../controllers/notificationController';

const router = Router();
router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);

export default router;
