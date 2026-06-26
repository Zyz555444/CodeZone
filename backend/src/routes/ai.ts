import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  codeCompletion,
  explainCode,
  generateCode,
  reviewCode,
  improveCode,
  chatWithAI,
  streamChat,
  agentExecute,
  abortAgent,
} from '../controllers/aiController';

const router = Router();

router.use(authenticate);

router.post('/complete', codeCompletion);
router.post('/explain', explainCode);
router.post('/generate', generateCode);
router.post('/review', reviewCode);
router.post('/improve', improveCode);
router.post('/chat', chatWithAI);
router.post('/chat/stream', streamChat);
router.post('/agent', agentExecute);
router.post('/agent/abort', abortAgent);

export default router;
