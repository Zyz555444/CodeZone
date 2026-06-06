import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createFile, deleteFile, updateFileName } from '../controllers/fileController';

const router = Router();
router.use(authenticate);

router.post('/files', createFile);
router.put('/files/:id/name', updateFileName);
router.delete('/files/:id', deleteFile);

export default router;
