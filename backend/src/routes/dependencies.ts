import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { addDependency, removeDependency, getDependencies } from '../controllers/dependencyController';

const router = Router();

router.get('/:taskId/dependencies', authenticate, getDependencies);
router.post('/:taskId/dependencies', authenticate, addDependency);
router.delete('/:taskId/dependencies/:dependsOnId', authenticate, removeDependency);

export default router;
