// 合并请求路由
import { Router } from "express";
import type { Request, Response } from "express";
import { prRepo, commentRepo } from "../repository.js";
import { authMiddleware } from "../auth.js";

const router = Router({ mergeParams: true });

interface RepoParams {
  repoId?: string;
  prId?: string;
}

// PR 列表
router.get("/", async (req: Request<RepoParams>, res: Response) => {
  const status = (req.query.status as string) || "all";
  const prs = await prRepo.list(req.params.repoId!, status);
  res.json({ data: prs });
});

// PR 详情 (含评论)
router.get("/:prId", async (req: Request<RepoParams>, res: Response) => {
  const pr = await prRepo.getById(req.params.repoId!, req.params.prId!);
  if (!pr) {
    res.status(404).json({ message: "合并请求不存在" });
    return;
  }
  const comments = await commentRepo.list("pull", pr.id);
  res.json({ data: { ...pr, comments } });
});

// 添加行内评论
router.post("/:prId/comments", authMiddleware, async (req: Request<RepoParams>, res: Response) => {
  const pr = await prRepo.getById(req.params.repoId!, req.params.prId!);
  if (!pr) {
    res.status(404).json({ message: "合并请求不存在" });
    return;
  }
  const { body, lineNumber } = req.body as {
    body: string; lineNumber: number | null;
  };
  const comment = await commentRepo.create({
    targetType: "pull",
    targetId: pr.id,
    authorId: req.user!.id,
    body,
    lineNumber,
  });
  res.status(201).json({ data: comment });
});

export default router;
