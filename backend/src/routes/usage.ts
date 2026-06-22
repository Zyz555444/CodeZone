import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getUsage } from '../controllers/usageController';

const router = Router();

router.use(authenticate);
router.get('/:teamId', getUsage);

export default router;
