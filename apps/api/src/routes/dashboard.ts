// 工作台路由
import { Router } from "express";
import type { Request, Response } from "express";
import { activityRepo, userRepo, repoRepo, statsRepo } from "../repository.js";
import { authMiddleware } from "../auth.js";

const router = Router();

// 活动流 (附带 actor 与 repo 信息)
router.get("/activities", authMiddleware, async (req: Request, res: Response) => {
  // 限制 limit 在 [1, 50] 区间,防止恶意大数导致全表扫描 / DoS
  const raw = parseInt((req.query.limit as string) || "15", 10);
  const limit = Math.min(50, Math.max(1, Number.isFinite(raw) ? raw : 15));
  const activities = await activityRepo.list(limit);
  const enriched = await Promise.all(
    activities.map(async (a) => ({
      ...a,
      actor: await userRepo.getById(a.actorId),
      repo: await repoRepo.getById(a.repoId),
    })),
  );
  res.json({ data: enriched });
});

// 工作台统计 (从数据库实时聚合)
router.get("/stats", authMiddleware, async (_req: Request, res: Response) => {
  const stats = await statsRepo.getStats();
  res.json({ data: stats });
});

export default router;
