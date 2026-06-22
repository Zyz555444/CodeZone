import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getSettings, updateSettings, validateSettings, listModels } from '../controllers/aiSettingsController';

const router = Router();

router.use(authenticate);

router.get('/settings/:teamId', getSettings);
router.put('/settings/:teamId', updateSettings);
router.post('/settings/:teamId/validate', validateSettings);
router.get('/models/:teamId?', listModels);

export default router;
