// 通知路由
import { Router } from "express";
import type { Request, Response } from "express";
import { notificationRepo } from "../repository.js";
import { authMiddleware } from "../auth.js";

const router = Router();

// 当前用户的通知列表
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  const filter = (req.query.filter as string) || "all";
  const notifications = await notificationRepo.listByUser(req.user!.id, filter);
  res.json({ data: notifications });
});

// 未读数量
router.get("/unread-count", authMiddleware, async (req: Request, res: Response) => {
  const count = await notificationRepo.unreadCount(req.user!.id);
  res.json({ data: { count } });
});

// 标记单条已读
router.post("/:id/read", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  await notificationRepo.markRead(req.params.id);
  res.json({ data: { success: true } });
});

// 标记全部已读
router.post("/read-all", authMiddleware, async (req: Request, res: Response) => {
  await notificationRepo.markAllRead(req.user!.id);
  res.json({ data: { success: true } });
});

export default router;
