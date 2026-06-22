import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  updateConversation,
} from '../controllers/aiConversationController';

const router = Router();

router.use(authenticate);

router.get('/', listConversations);
router.post('/', createConversation);
router.get('/:id', getConversation);
router.delete('/:id', deleteConversation);
router.patch('/:id', updateConversation);

export default router;
