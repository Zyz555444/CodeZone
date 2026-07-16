/**
 * CodeZone · 协作文档路由
 *
 * GET    /                    → 列出团队文档
 * POST   /                    → 创建文档
 * GET    /:id                 → 获取文档详情
 * PATCH  /:id                 → 更新标题/内容
 * DELETE /:id                 → 删除文档
 * POST   /:id/save            → 保存内容（自动创建版本）
 * GET    /:id/versions        → 列出版本历史
 * GET    /:id/versions/:vid   → 获取版本详情
 * POST   /:id/versions        → 创建版本快照
 * GET    /:id/comments        → 列出评论
 * POST   /:id/comments        → 创建评论
 * PATCH  /:id/comments/:cid   → 解决/恢复评论
 * DELETE /:id/comments/:cid   → 删除评论
 * GET    /:id/presence        → 获取房间在线协作者数
 */
import { Router } from "express";
import type { Request, Response } from "express";
import type { TeamMember, Document } from "@codezone/shared";
import { docRepo, docVersionRepo, docCommentRepo, teamMemberRepo } from "../repository.js";
import { authMiddleware } from "../auth.js";
import { getRoomOnlineCount } from "../ws.js";

const router = Router();

type DocAccessResult =
  | { error: string; status: number }
  | { membership: TeamMember; doc: Document };

/** 确保用户在团队中且文档属于该团队 */
async function ensureDocAccess(userId: string, docId: string): Promise<DocAccessResult> {
  const membership = await teamMemberRepo.getByUser(userId);
  if (!membership) return { error: "您尚未加入任何团队", status: 404 };
  const doc = await docRepo.getById(docId);
  if (!doc) return { error: "文档不存在", status: 404 };
  if (doc.teamId !== membership.teamId) return { error: "无权访问此文档", status: 403 };
  return { membership, doc };
}

// ─────────── GET / — 列出团队文档 ───────────
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  const membership = await teamMemberRepo.getByUser(req.user!.id);
  if (!membership) {
    res.status(404).json({ message: "您尚未加入任何团队" });
    return;
  }
  const docs = await docRepo.listByTeam(membership.teamId);
  res.json({ data: docs });
});

// ─────────── POST / — 创建文档 ───────────
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const membership = await teamMemberRepo.getByUser(req.user!.id);
  if (!membership) {
    res.status(404).json({ message: "您尚未加入任何团队" });
    return;
  }
  const { title, content, language } = req.body as { title?: string; content?: string; language?: string };
  if (!title) {
    res.status(400).json({ message: "文档标题为必填" });
    return;
  }
  const doc = await docRepo.create({
    teamId: membership.teamId,
    title,
    content: content ?? "",
    language: language ?? "typescript",
    createdBy: req.user!.id,
  });
  res.status(201).json({ data: doc });
});

// ─────────── GET /:id — 获取文档详情 ───────────
router.get("/:id", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  const access = await ensureDocAccess(req.user!.id, req.params.id);
  if ("error" in access) {
    res.status(access.status).json({ message: access.error });
    return;
  }
  res.json({ data: access.doc });
});

// ─────────── PATCH /:id — 更新标题/内容 ───────────
router.patch("/:id", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  const access = await ensureDocAccess(req.user!.id, req.params.id);
  if ("error" in access) {
    res.status(access.status).json({ message: access.error });
    return;
  }
  const { title, content } = req.body as { title?: string; content?: string };
  if (title === undefined && content === undefined) {
    res.status(400).json({ message: "至少需要更新 title 或 content 之一" });
    return;
  }
  if (title !== undefined) {
    if (!title.trim()) {
      res.status(400).json({ message: "标题不能为空" });
      return;
    }
    await docRepo.updateTitle(access.doc.id, title);
  }
  if (content !== undefined) {
    await docRepo.updateContent(access.doc.id, content, req.user!.id);
  }
  const updated = await docRepo.getById(access.doc.id);
  res.json({ data: updated });
});

// ─────────── DELETE /:id — 删除文档 ───────────
router.delete("/:id", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  const access = await ensureDocAccess(req.user!.id, req.params.id);
  if ("error" in access) {
    res.status(access.status).json({ message: access.error });
    return;
  }
  // 仅创建者或 owner/admin 可删除
  const isOwner = access.membership.role === "owner";
  const isAdmin = access.membership.role === "admin";
  const isCreator = access.doc.createdBy === req.user!.id;
  if (!isOwner && !isAdmin && !isCreator) {
    res.status(403).json({ message: "仅创建者或管理员可删除文档" });
    return;
  }
  await docRepo.delete(access.doc.id);
  res.json({ data: { success: true } });
});

// ─────────── POST /:id/save — 保存内容（静默保存，不创建版本） ───────────
router.post("/:id/save", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  const access = await ensureDocAccess(req.user!.id, req.params.id);
  if ("error" in access) {
    res.status(access.status).json({ message: access.error });
    return;
  }
  const { content } = req.body as { content?: string };
  if (content === undefined) {
    res.status(400).json({ message: "content 为必填" });
    return;
  }
  await docRepo.updateContent(access.doc.id, content, req.user!.id);
  const updated = await docRepo.getById(access.doc.id);
  res.json({ data: updated });
});

// ─────────── GET /:id/versions — 列出版本历史 ───────────
router.get("/:id/versions", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  const access = await ensureDocAccess(req.user!.id, req.params.id);
  if ("error" in access) {
    res.status(access.status).json({ message: access.error });
    return;
  }
  const limit = parseInt(req.query.limit as string, 10) || 30;
  const versions = await docVersionRepo.listByDoc(access.doc.id, limit);
  res.json({ data: versions });
});

// ─────────── GET /:id/versions/:vid — 获取版本详情 ───────────
router.get("/:id/versions/:vid", authMiddleware, async (req: Request<{ id: string; vid: string }>, res: Response) => {
  const access = await ensureDocAccess(req.user!.id, req.params.id);
  if ("error" in access) {
    res.status(access.status).json({ message: access.error });
    return;
  }
  const version = await docVersionRepo.getById(req.params.vid);
  if (!version || version.docId !== access.doc.id) {
    res.status(404).json({ message: "版本不存在" });
    return;
  }
  res.json({ data: version });
});

// ─────────── POST /:id/versions — 创建版本快照 ───────────
router.post("/:id/versions", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  const access = await ensureDocAccess(req.user!.id, req.params.id);
  if ("error" in access) {
    res.status(access.status).json({ message: access.error });
    return;
  }
  const { content, message } = req.body as { content?: string; message?: string };
  const snapshotContent = content ?? (await docRepo.getById(access.doc.id))?.content ?? "";
  const version = await docVersionRepo.create({
    docId: access.doc.id,
    content: snapshotContent,
    authorId: req.user!.id,
    message: message ?? "保存版本",
  });
  res.status(201).json({ data: version });
});

// ─────────── GET /:id/comments — 列出评论 ───────────
router.get("/:id/comments", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  const access = await ensureDocAccess(req.user!.id, req.params.id);
  if ("error" in access) {
    res.status(access.status).json({ message: access.error });
    return;
  }
  const comments = await docCommentRepo.listByDoc(access.doc.id);
  res.json({ data: comments });
});

// ─────────── POST /:id/comments — 创建评论 ───────────
router.post("/:id/comments", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  const access = await ensureDocAccess(req.user!.id, req.params.id);
  if ("error" in access) {
    res.status(access.status).json({ message: access.error });
    return;
  }
  const { body, lineNumber } = req.body as { body?: string; lineNumber?: number };
  if (!body) {
    res.status(400).json({ message: "评论内容为必填" });
    return;
  }
  const comment = await docCommentRepo.create({
    docId: access.doc.id,
    authorId: req.user!.id,
    body,
    lineNumber: lineNumber ?? null,
  });
  res.status(201).json({ data: comment });
});

// ─────────── PATCH /:id/comments/:cid — 解决/恢复评论 ───────────
router.patch("/:id/comments/:cid", authMiddleware, async (req: Request<{ id: string; cid: string }>, res: Response) => {
  const access = await ensureDocAccess(req.user!.id, req.params.id);
  if ("error" in access) {
    res.status(access.status).json({ message: access.error });
    return;
  }
  const { resolved } = req.body as { resolved?: boolean };
  if (resolved === undefined) {
    res.status(400).json({ message: "resolved 为必填" });
    return;
  }
  // 校验评论属于本文档,且操作者为评论作者或管理员,防跨文档越权
  const comment = await docCommentRepo.getById(req.params.cid);
  if (!comment || comment.docId !== access.doc.id) {
    res.status(404).json({ message: "评论不存在" });
    return;
  }
  const isAuthor = comment.authorId === req.user!.id;
  const canManage = access.membership.role === "owner" || access.membership.role === "admin";
  if (!isAuthor && !canManage) {
    res.status(403).json({ message: "仅评论作者或管理员可操作" });
    return;
  }
  await docCommentRepo.resolve(req.params.cid, access.doc.id, resolved);
  res.json({ data: { success: true } });
});

// ─────────── DELETE /:id/comments/:cid — 删除评论 ───────────
router.delete("/:id/comments/:cid", authMiddleware, async (req: Request<{ id: string; cid: string }>, res: Response) => {
  const access = await ensureDocAccess(req.user!.id, req.params.id);
  if ("error" in access) {
    res.status(access.status).json({ message: access.error });
    return;
  }
  const comment = await docCommentRepo.getById(req.params.cid);
  if (!comment || comment.docId !== access.doc.id) {
    res.status(404).json({ message: "评论不存在" });
    return;
  }
  const isAuthor = comment.authorId === req.user!.id;
  const canManage = access.membership.role === "owner" || access.membership.role === "admin";
  if (!isAuthor && !canManage) {
    res.status(403).json({ message: "仅评论作者或管理员可删除评论" });
    return;
  }
  await docCommentRepo.delete(req.params.cid, access.doc.id);
  res.json({ data: { success: true } });
});

// ─────────── GET /:id/presence — 获取房间在线协作者数 ───────────
router.get("/:id/presence", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  const access = await ensureDocAccess(req.user!.id, req.params.id);
  if ("error" in access) {
    res.status(access.status).json({ message: access.error });
    return;
  }
  res.json({ data: { onlineCount: getRoomOnlineCount(access.doc.id) } });
});

export default router;
