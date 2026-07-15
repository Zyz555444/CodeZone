// 里程碑路由
import { Router } from "express";
import type { Request, Response } from "express";
import { milestoneRepo } from "../repository.js";

const router = Router();

// 全部里程碑
router.get("/", async (_req: Request, res: Response) => {
  const milestones = await milestoneRepo.list();
  res.json({ data: milestones });
});

// 按仓库列出里程碑
router.get("/repo/:repoId", async (req: Request, res: Response) => {
  const milestones = await milestoneRepo.listByRepo(req.params.repoId);
  res.json({ data: milestones });
});

export default router;
