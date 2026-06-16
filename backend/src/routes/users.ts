import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getUsers, updateProfile, updatePassword } from '../controllers/userController';

const router = Router();
router.use(authenticate);

router.get('/search', getUsers);
router.patch('/profile', updateProfile);
router.patch('/password', updatePassword);

export default router;
