// 讨论路由
import { Router } from "express";
import type { Request, Response } from "express";
import { store } from "../db/store";

const router = Router({ mergeParams: true });

interface RepoParams {
  repoId: string;
}

router.get("/", (req: Request<RepoParams>, res: Response) => {
  res.json({ data: store.listDiscussions(req.params.repoId) });
});

export default router;
