import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getTasks, createTask, getTask, updateTask, deleteTask } from '../controllers/taskController';

const router = Router();
router.use(authenticate);

router.get('/', getTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
