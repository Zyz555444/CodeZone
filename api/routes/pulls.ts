// 合并请求路由
import { Router } from "express";
import type { Request, Response } from "express";
import { store } from "../db/store";

const router = Router({ mergeParams: true });

interface RepoParams {
  repoId: string;
  prId?: string;
}

// PR 列表
router.get("/", (req: Request<RepoParams>, res: Response) => {
  const status = (req.query.status as string) || "all";
  res.json({ data: store.listPRs(req.params.repoId, status) });
});

// PR 详情
router.get("/:prId", (req: Request<RepoParams>, res: Response) => {
  const pr = store.getPR(req.params.repoId, req.params.prId!);
  if (!pr) {
    res.status(404).json({ message: "合并请求不存在" });
    return;
  }
  const comments = store.listComments("pull", pr.id);
  res.json({ data: { ...pr, comments } });
});

// 添加行内评论
router.post("/:prId/comments", (req: Request<RepoParams>, res: Response) => {
  const pr = store.getPR(req.params.repoId, req.params.prId!);
  if (!pr) {
    res.status(404).json({ message: "合并请求不存在" });
    return;
  }
  const { body, lineNumber, authorId } = req.body as {
    body: string; lineNumber: number | null; authorId: string;
  };
  const comment = store.addComment({
    targetType: "pull",
    targetId: pr.id,
    authorId,
    body,
    lineNumber,
  });
  res.json({ data: comment });
});

export default router;
