import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { search } from '../controllers/searchController';

const router = Router();
router.use(authenticate);

router.get('/', search);

export default router;
