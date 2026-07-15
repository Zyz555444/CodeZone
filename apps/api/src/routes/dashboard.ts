// 工作台路由
import { Router } from "express";
import type { Request, Response } from "express";
import { activityRepo, userRepo, repoRepo, statsRepo } from "../repository.js";

const router = Router();

// 活动流 (附带 actor 与 repo 信息)
router.get("/activities", async (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit as string) || "15", 10);
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
router.get("/stats", async (_req: Request, res: Response) => {
  const stats = await statsRepo.getStats();
  res.json({ data: stats });
});

export default router;
