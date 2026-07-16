// 讨论路由
import { Router } from "express";
import type { Request, Response } from "express";
import { discussionRepo } from "../repository.js";
import { authMiddleware } from "../auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

interface RepoParams {
  repoId?: string;
}

router.get("/", async (req: Request<RepoParams>, res: Response) => {
  const discussions = await discussionRepo.list(req.params.repoId!);
  res.json({ data: discussions });
});

export default router;
