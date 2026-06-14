import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createSubTask, updateSubTask, deleteSubTask } from '../controllers/subtaskController';

const router = Router();
router.use(authenticate);

// 子任务 CRUD
router.post('/tasks/:taskId/subtasks', createSubTask);
router.patch('/:id', updateSubTask);
router.delete('/:id', deleteSubTask);

export default router;
