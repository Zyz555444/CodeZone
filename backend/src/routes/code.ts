import express from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getFiles, getFile, updateFile, getFilesTree } from '../controllers/codeController';

const router = Router();
router.use(authenticate);

router.get('/files', getFilesTree);
router.get('/files/:id', getFile);
router.put('/files/:id', updateFile);
router.get('/directories', getFiles);

export default router;
