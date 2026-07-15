/**
 * CodeZone · 团队路由
 *
 * GET    /                 → 获取当年团队信息 + 成员列表
 * POST   /                 → 创建团队 (需认证)
 * PATCH  /                 → 更新团队名称
 * POST   /join             → 已有账号的用户通过邀请码加入团队
 * POST   /invite-codes     → 生成邀请码 (需 owner/admin)
 * GET    /invite-codes     → 获取团队邀请码列表
 * DELETE /invite-codes/:id → 删除邀请码
 * PATCH  /members/:userId  → 变更成员角色 (需 owner)
 * DELETE /members/:userId  → 移除成员 (需 owner/admin)
 */
import { Router } from "express";
import type { Request, Response } from "express";
import crypto from "node:crypto";
import { teamRepo, teamMemberRepo, inviteCodeRepo, userRepo } from "../repository.js";
import { authMiddleware, requireTeamRole } from "../auth.js";
import { getOnlineCount, getTeamOnlineCount } from "../ws.js";
import type { TeamRole } from "@codezone/shared";

const router = Router();

// 生成 8 位邀请码
function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// ─────────── GET / — 获取当前用户所属团队及其成员 ───────────
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  const membership = await teamMemberRepo.getByUser(req.user!.id);
  if (!membership) {
    res.status(404).json({ message: "您尚未加入任何团队" });
    return;
  }
  const team = await teamRepo.getById(membership.teamId);
  if (!team) {
    res.status(404).json({ message: "团队不存在" });
    return;
  }
  const members = await teamMemberRepo.listByTeam(team.id);
  const memberUsers = await Promise.all(
    members.map(async (m) => {
      const u = await userRepo.getById(m.userId);
      return { ...m, user: u };
    }),
  );
  res.json({ data: { team, members: memberUsers, myRole: membership.role } });
});

// ─────────── POST / — 创建团队 ───────────
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const existing = await teamMemberRepo.getByUser(userId);
  if (existing) {
    res.status(409).json({ message: "您已在一个团队中，请先退出" });
    return;
  }
  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ message: "团队名称为必填" });
    return;
  }
  const team = await teamRepo.create({ name, ownerId: userId });
  await teamMemberRepo.add({ teamId: team.id, userId, role: "owner" });
  const members = await teamMemberRepo.listByTeam(team.id);
  const memberUsers = await Promise.all(
    members.map(async (m) => {
      const u = await userRepo.getById(m.userId);
      return { ...m, user: u };
    }),
  );
  res.status(201).json({ data: { team, members: memberUsers, myRole: "owner" as TeamRole } });
});

// ─────────── PATCH / — 更新团队名称 ───────────
router.patch("/", authMiddleware, async (req: Request, res: Response) => {
  const membership = await teamMemberRepo.getByUser(req.user!.id);
  if (!membership || membership.role !== "owner") {
    res.status(403).json({ message: "仅团队所有者可修改团队信息" });
    return;
  }
  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ message: "团队名称为必填" });
    return;
  }
  const team = await teamRepo.getById(membership.teamId);
  if (!team) {
    res.status(404).json({ message: "团队不存在" });
    return;
  }
  // 简单 update name
  const { db, schema } = await import("@codezone/database");
  const { eq } = await import("drizzle-orm");
  await db.update(schema.teams).set({ name }).where(eq(schema.teams.id, team.id));
  const updated = await teamRepo.getById(team.id);
  res.json({ data: updated });
});

// ─────────── POST /join — 已有账号的用户通过邀请码加入团队 ───────────
router.post("/join", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const existing = await teamMemberRepo.getByUser(userId);
  if (existing) {
    res.status(409).json({ message: "您已在一个团队中，请先退出" });
    return;
  }
  const { code } = req.body as { code: string };
  if (!code) {
    res.status(400).json({ message: "邀请码为必填" });
    return;
  }
  const ic = await inviteCodeRepo.getByCode(code);
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
  await teamMemberRepo.add({ teamId: ic.teamId, userId, role: "member" });
  await inviteCodeRepo.incrementUsed(ic.id);
  const team = await teamRepo.getById(ic.teamId);
  const members = await teamMemberRepo.listByTeam(ic.teamId);
  const memberUsers = await Promise.all(
    members.map(async (m) => {
      const u = await userRepo.getById(m.userId);
      return { ...m, user: u };
    }),
  );
  res.json({ data: { team, members: memberUsers, myRole: "member" as TeamRole } });
});

// ─────────── POST /invite-codes — 生成邀请码 ───────────
router.post("/invite-codes", authMiddleware, async (req: Request, res: Response) => {
  const membership = await teamMemberRepo.getByUser(req.user!.id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    res.status(403).json({ message: "仅团队所有者或管理员可生成邀请码" });
    return;
  }
  const { maxUses, expiresInDays } = req.body as { maxUses?: number; expiresInDays?: number };
  const code = generateInviteCode();
  const expiresAt = expiresInDays ? Date.now() + expiresInDays * 86400000 : null;
  const ic = await inviteCodeRepo.create({
    teamId: membership.teamId,
    code,
    createdBy: req.user!.id,
    maxUses: maxUses ?? 0,
    expiresAt,
  });
  res.status(201).json({ data: ic });
});

// ─────────── GET /invite-codes — 获取团队邀请码列表 ───────────
router.get("/invite-codes", authMiddleware, async (req: Request, res: Response) => {
  const membership = await teamMemberRepo.getByUser(req.user!.id);
  if (!membership) {
    res.status(404).json({ message: "您尚未加入任何团队" });
    return;
  }
  const codes = await inviteCodeRepo.listByTeam(membership.teamId);
  res.json({ data: codes });
});

// ─────────── DELETE /invite-codes/:id — 删除邀请码 ───────────
router.delete("/invite-codes/:id", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  const membership = await teamMemberRepo.getByUser(req.user!.id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    res.status(403).json({ message: "仅团队所有者或管理员可删除邀请码" });
    return;
  }
  const ic = await inviteCodeRepo.getById(req.params.id);
  if (!ic || ic.teamId !== membership.teamId) {
    res.status(404).json({ message: "邀请码不存在" });
    return;
  }
  await inviteCodeRepo.delete(req.params.id);
  res.json({ data: { success: true } });
});

// ─────────── PATCH /members/:userId — 变更成员角色 ───────────
router.patch("/members/:userId", authMiddleware, async (req: Request<{ userId: string }>, res: Response) => {
  const membership = await teamMemberRepo.getByUser(req.user!.id);
  if (!membership || membership.role !== "owner") {
    res.status(403).json({ message: "仅团队所有者可变更成员角色" });
    return;
  }
  const { role } = req.body as { role: TeamRole };
  if (!role || !["admin", "member"].includes(role)) {
    res.status(400).json({ message: "角色须为 admin 或 member" });
    return;
  }
  const target = await teamMemberRepo.getByTeamAndUser(membership.teamId, req.params.userId);
  if (!target) {
    res.status(404).json({ message: "成员不存在" });
    return;
  }
  if (target.role === "owner") {
    res.status(403).json({ message: "无法变更所有者的角色" });
    return;
  }
  await teamMemberRepo.updateRole(membership.teamId, req.params.userId, role);
  res.json({ data: { success: true } });
});

// ─────────── DELETE /members/:userId — 移除成员 ───────────
router.delete("/members/:userId", authMiddleware, async (req: Request<{ userId: string }>, res: Response) => {
  const membership = await teamMemberRepo.getByUser(req.user!.id);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    res.status(403).json({ message: "仅团队所有者或管理员可移除成员" });
    return;
  }
  const target = await teamMemberRepo.getByTeamAndUser(membership.teamId, req.params.userId);
  if (!target) {
    res.status(404).json({ message: "成员不存在" });
    return;
  }
  if (target.role === "owner") {
    res.status(403).json({ message: "无法移除团队所有者" });
    return;
  }
  if (membership.role === "admin" && target.role === "admin") {
    res.status(403).json({ message: "管理员无法移除其他管理员" });
    return;
  }
  await teamMemberRepo.remove(membership.teamId, req.params.userId);
  res.json({ data: { success: true } });
});

// ─────────── GET /online — 获取在线人数 ───────────
router.get("/online", authMiddleware, async (req: Request, res: Response) => {
  const membership = await teamMemberRepo.getByUser(req.user!.id);
  const teamId = membership?.teamId ?? null;
  const total = getOnlineCount();
  const teamOnline = teamId ? getTeamOnlineCount(teamId) : 0;
  res.json({ data: { total, teamOnline } });
});

export default router;