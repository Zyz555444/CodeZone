// 议题路由
import { Router } from "express";
import type { Request, Response } from "express";
import { issueRepo, commentRepo } from "../repository.js";
import { authMiddleware } from "../auth.js";
import type { IssueStatus } from "@codezone/shared";

const router = Router({ mergeParams: true });

interface RepoParams {
  repoId?: string;
  issueId?: string;
}

// 议题列表
router.get("/", async (req: Request<RepoParams>, res: Response) => {
  const repoId = req.params.repoId!;
  const status = (req.query.status as string) || "all";
  const issues = await issueRepo.list(repoId, status);
  res.json({ data: issues });
});

// 议题详情 (含评论)
router.get("/:issueId", async (req: Request<RepoParams>, res: Response) => {
  const issue = await issueRepo.getById(req.params.repoId!, req.params.issueId!);
  if (!issue) {
    res.status(404).json({ message: "议题不存在" });
    return;
  }
  const comments = await commentRepo.list("issue", issue.id);
  res.json({ data: { ...issue, comments } });
});

// 更新议题状态
router.patch("/:issueId", authMiddleware, async (req: Request<RepoParams>, res: Response) => {
  const { status } = req.body as { status: IssueStatus };
  const issue = await issueRepo.updateStatus(req.params.repoId!, req.params.issueId!, status);
  if (!issue) {
    res.status(404).json({ message: "议题不存在" });
    return;
  }
  res.json({ data: issue });
});

// 创建议题
router.post("/", authMiddleware, async (req: Request<RepoParams>, res: Response) => {
  const { title, body, priority, assigneeId } = req.body as {
    title: string; body: string; priority?: string; assigneeId?: string | null;
  };
  if (!title) {
    res.status(400).json({ message: "标题为必填" });
    return;
  }
  // 计算下一个 number
  const existing = await issueRepo.list(req.params.repoId!);
  const number = existing.length + 1;
  const issue = await issueRepo.create({
    repoId: req.params.repoId!,
    number,
    title,
    body: body ?? "",
    priority,
    assigneeId: assigneeId ?? req.user!.id,
  });
  res.status(201).json({ data: issue });
});

// 添加评论
router.post("/:issueId/comments", authMiddleware, async (req: Request<RepoParams>, res: Response) => {
  const issue = await issueRepo.getById(req.params.repoId!, req.params.issueId!);
  if (!issue) {
    res.status(404).json({ message: "议题不存在" });
    return;
  }
  const { body } = req.body as { body: string };
  const comment = await commentRepo.create({
    targetType: "issue",
    targetId: issue.id,
    authorId: req.user!.id,
    body,
  });
  res.status(201).json({ data: comment });
});

export default router;
