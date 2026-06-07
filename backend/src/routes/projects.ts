import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { 
  getProjects, 
  createProject, 
  getProject, 
  updateProject, 
  deleteProject,
  getProjectMembers,
  addMember,
  removeMember 
} from '../controllers/projectController';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// GET /api/projects
router.get('/', getProjects);

// POST /api/projects
router.post('/', createProject);

// GET /api/projects/:id
router.get('/:id', getProject);

// PATCH /api/projects/:id
router.patch('/:id', updateProject);

// DELETE /api/projects/:id
router.delete('/:id', deleteProject);

// GET /api/projects/:id/members
router.get('/:id/members', getProjectMembers);

// POST /api/projects/:id/members
router.post('/:id/members', addMember);

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', removeMember);

export default router;
