import express from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getReviews, createReview, updateReview } from '../controllers/reviewController';

const router = Router();
router.use(authenticate);

router.get('/reviews', getReviews);
router.post('/reviews', createReview);
router.patch('/reviews/:id', updateReview);

export default router;
