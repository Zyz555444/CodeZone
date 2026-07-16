// 里程碑路由
import { Router } from "express";
import type { Request, Response } from "express";
import { milestoneRepo, repoRepo } from "../repository.js";
import { authMiddleware } from "../auth.js";

const router = Router();
router.use(authMiddleware);

// 全部里程碑
router.get("/", async (_req: Request, res: Response) => {
  const milestones = await milestoneRepo.list();
  res.json({ data: milestones });
});

// 按仓库列出里程碑
router.get("/repo/:repoId", async (req: Request<{ repoId: string }>, res: Response) => {
  const milestones = await milestoneRepo.listByRepo(req.params.repoId);
  res.json({ data: milestones });
});

// 新建里程碑
router.post("/", async (req: Request, res: Response) => {
  const { repoId, title, description, dueDate } = req.body as {
    repoId?: string;
    title?: string;
    description?: string;
    dueDate?: number;
  };
  if (!repoId || !title || !dueDate) {
    res.status(400).json({ message: "仓库、标题、截止日期为必填" });
    return;
  }
  const repo = await repoRepo.getById(repoId);
  if (!repo) {
    res.status(404).json({ message: "仓库不存在" });
    return;
  }
  const milestone = await milestoneRepo.create({ repoId, title, description, dueDate });
  res.status(201).json({ data: milestone });
});

export default router;
