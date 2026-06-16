import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createFeedback } from '../controllers/feedbackController';

const router = Router();
router.use(authenticate);

router.post('/', createFeedback);

export default router;
