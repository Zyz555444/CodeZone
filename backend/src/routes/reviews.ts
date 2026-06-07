import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getReviews, createReview, updateReview } from '../controllers/reviewController';

const router = Router();
router.use(authenticate);

// 注意：这些路由会被挂载到 /api/reviews，所以这里不需要 /reviews 前缀
router.get('/', getReviews);
router.post('/', createReview);
router.patch('/:id', updateReview);

export default router;
