import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getActivities } from '../controllers/activityController';

const router = Router();
router.use(authenticate);

router.get('/', getActivities);

export default router;
