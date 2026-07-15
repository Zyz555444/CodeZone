// 讨论路由
import { Router } from "express";
import type { Request, Response } from "express";
import { discussionRepo } from "../repository.js";

const router = Router({ mergeParams: true });

interface RepoParams {
  repoId?: string;
}

router.get("/", async (req: Request<RepoParams>, res: Response) => {
  const discussions = await discussionRepo.list(req.params.repoId!);
  res.json({ data: discussions });
});

export default router;
