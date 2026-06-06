import express from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getUsers } from '../controllers/userController';

const router = Router();
router.use(authenticate);

router.get('/search', getUsers);

export default router;
