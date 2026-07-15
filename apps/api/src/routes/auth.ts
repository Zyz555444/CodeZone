/**
 * CodeZone · 认证路由
 * POST /register · POST /login · GET /me · POST /logout
 * POST /register-admin · POST /join-by-invite
 */
import { Router } from "express";
import type { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import { userRepo, teamRepo, teamMemberRepo, inviteCodeRepo } from "../repository.js";
import { signToken, authMiddleware, type AuthUser } from "../auth.js";

const router = Router();

// 注册
router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };
  if (!name || !email || !password) {
    res.status(400).json({ message: "姓名、邮箱、密码均为必填" });
    return;
  }
  const existing = await userRepo.getByEmail(email);
  if (existing) {
    res.status(409).json({ message: "该邮箱已注册" });
    return;
  }
  const passwordHash = bcryptjs.hashSync(password, 10);
  const id = `u${Date.now()}`;
  const user = await userRepo.create({ id, name, email, passwordHash });
  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(authUser);
  res.status(201).json({ data: { user, token } });
});

// 团队管理员注册 — 创建团队并注册为 owner
router.post("/register-admin", async (req: Request, res: Response) => {
  const { name, email, password, teamName } = req.body as {
    name: string; email: string; password: string; teamName: string;
  };
  if (!name || !email || !password || !teamName) {
    res.status(400).json({ message: "姓名、邮箱、密码、团队名称均为必填" });
    return;
  }
  const existing = await userRepo.getByEmail(email);
  if (existing) {
    res.status(409).json({ message: "该邮箱已注册" });
    return;
  }
  const passwordHash = bcryptjs.hashSync(password, 10);
  const userId = `u${Date.now()}`;
  const user = await userRepo.create({ id: userId, name, email, passwordHash, role: "admin" });
  const team = await teamRepo.create({ name: teamName, ownerId: userId });
  await teamMemberRepo.add({ teamId: team.id, userId, role: "owner" });
  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(authUser);
  res.status(201).json({ data: { user, token, team } });
});

// 通过邀请码注册加入团队
router.post("/join-by-invite", async (req: Request, res: Response) => {
  const { name, email, password, inviteCode } = req.body as {
    name: string; email: string; password: string; inviteCode: string;
  };
  if (!name || !email || !password || !inviteCode) {
    res.status(400).json({ message: "姓名、邮箱、密码、邀请码均为必填" });
    return;
  }
  const ic = await inviteCodeRepo.getByCode(inviteCode);
  if (!ic) {
    res.status(400).json({ message: "邀请码无效" });
    return;
  }
  if (ic.expiresAt && ic.expiresAt < Date.now()) {
    res.status(400).json({ message: "邀请码已过期" });
    return;
  }
  if (ic.maxUses > 0 && ic.usedCount >= ic.maxUses) {
    res.status(400).json({ message: "邀请码已用完" });
    return;
  }
  const existing = await userRepo.getByEmail(email);
  if (existing) {
    res.status(409).json({ message: "该邮箱已注册" });
    return;
  }
  const passwordHash = bcryptjs.hashSync(password, 10);
  const userId = `u${Date.now()}`;
  const user = await userRepo.create({ id: userId, name, email, passwordHash });
  await teamMemberRepo.add({ teamId: ic.teamId, userId, role: "member" });
  await inviteCodeRepo.incrementUsed(ic.id);
  const team = await teamRepo.getById(ic.teamId);
  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(authUser);
  res.status(201).json({ data: { user, token, team } });
});

// 登录
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ message: "邮箱与密码均为必填" });
    return;
  }
  const user = await userRepo.getByEmail(email);
  if (!user || !user.passwordHash) {
    res.status(401).json({ message: "邮箱或密码错误" });
    return;
  }
  const valid = bcryptjs.compareSync(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "邮箱或密码错误" });
    return;
  }
  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(authUser);
  const { passwordHash: _ph, ...safeUser } = user;
  // 附上团队信息
  const membership = await teamMemberRepo.getByUser(user.id);
  const team = membership ? await teamRepo.getById(membership.teamId) : null;
  res.json({ data: { user: safeUser, token, team, teamRole: membership?.role ?? null } });
});

// 获取当前用户
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  const user = await userRepo.getById(req.user!.id);
  if (!user) {
    res.status(404).json({ message: "用户不存在" });
    return;
  }
  const membership = await teamMemberRepo.getByUser(user.id);
  const team = membership ? await teamRepo.getById(membership.teamId) : null;
  res.json({ data: { ...user, team, teamRole: membership?.role ?? null } });
});

// 登出 (JWT 无状态,前端丢弃 token 即可)
router.post("/logout", (_req: Request, res: Response) => {
  res.json({ data: { success: true } });
});

export default router;
