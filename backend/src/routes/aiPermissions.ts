import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { updateAIPermission, checkAIAccess } from '../controllers/aiPermissionController';

const router = Router();

router.use(authenticate);
router.get('/:teamId', checkAIAccess);
router.patch('/:teamId/:memberId', updateAIPermission);

export default router;
