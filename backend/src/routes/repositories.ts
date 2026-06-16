import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getRepositories,
  createRepository,
  getRepository,
  updateRepository,
  deleteRepository,
  getBranches,
  getCommits,
  createCommit,
} from '../controllers/repositoryController';

const router = Router();

router.use(authenticate);

router.get('/', getRepositories);
router.post('/', createRepository);
router.get('/:id', getRepository);
router.patch('/:id', updateRepository);
router.delete('/:id', deleteRepository);
router.get('/:id/branches', getBranches);
router.get('/:id/commits', getCommits);
router.post('/:id/commits', createCommit);

export default router;
