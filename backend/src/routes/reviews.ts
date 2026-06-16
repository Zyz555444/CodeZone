import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getReviews, getReview, createReview, updateReview } from '../controllers/reviewController';
import { getReviewComments, createReviewComment } from '../controllers/reviewCommentController';

const router = Router();
router.use(authenticate);

router.get('/', getReviews);
router.get('/:id', getReview);
router.post('/', createReview);
router.patch('/:id', updateReview);

// 审查评论子路由
router.get('/:reviewId/comments', getReviewComments);
router.post('/:reviewId/comments', createReviewComment);

export default router;
