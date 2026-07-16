// 合并请求路由
import { Router } from "express";
import type { Request, Response } from "express";
import { prRepo, commentRepo } from "../repository.js";
import { authMiddleware } from "../auth.js";
import type { PRStatus } from "@codezone/shared";

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

// 合并 PR — 支持 merge / squash / rebase 三种策略
router.post("/:prId/merge", authMiddleware, async (req: Request<RepoParams>, res: Response) => {
  const pr = await prRepo.getById(req.params.repoId!, req.params.prId!);
  if (!pr) {
    res.status(404).json({ message: "合并请求不存在" });
    return;
  }
  if (pr.status !== "open") {
    res.status(409).json({ message: `当前状态为 ${pr.status},无法合并` });
    return;
  }
  const hasFailed = pr.checks.some((c) => c.status === "failed");
  if (hasFailed) {
    res.status(409).json({ message: "存在失败的检查,暂不可合并" });
    return;
  }
  const { strategy } = req.body as { strategy?: "merge" | "squash" | "rebase" };
  // 当前为数据层合并 (写入 merged 状态);真实 git 合并可由 /git/:repoId/merge 完成
  const updated = await prRepo.updateStatus(req.params.repoId!, pr.id, "merged" as PRStatus);
  res.json({ data: { pr: updated, strategy: strategy ?? "merge" } });
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
