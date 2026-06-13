import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createTeam,
  getMyTeams,
  getTeamDetail,
  getInviteCode,
  joinTeam,
  approveMember,
  rejectMember,
  getPendingMembers,
} from '../controllers/teamController';

const router = Router();

router.use(authenticate);

// 团队 CRUD
router.post('/', createTeam);
router.get('/', getMyTeams);
router.get('/:id', getTeamDetail);

// 邀请码
router.get('/:id/invite-code', getInviteCode);

// 加入团队
router.post('/join', joinTeam);

// 成员管理（管理员操作）
router.post('/:teamId/members/:userId/approve', approveMember);
router.delete('/:teamId/members/:userId/reject', rejectMember);

// 待审核列表
router.get('/:id/pending-members', getPendingMembers);

export default router;
