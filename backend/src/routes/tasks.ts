import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getTasks, createTask, getTask, updateTask, deleteTask } from '../controllers/taskController';
import { getComments, createComment } from '../controllers/commentController';
import { createSubTask, updateSubTask, deleteSubTask } from '../controllers/subtaskController';

const router = Router();
router.use(authenticate);

router.get('/', getTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

// 任务评论子路由
router.get('/:taskId/comments', getComments);
router.post('/:taskId/comments', createComment);

// 子任务路由
router.post('/:taskId/subtasks', createSubTask);
router.patch('/subtasks/:id', updateSubTask);
router.delete('/subtasks/:id', deleteSubTask);

export default router;
