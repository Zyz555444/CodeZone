// 议题路由
import { Router, type Request, type Response } from "express";
import { store } from "../db/store";
import type { IssueStatus } from "@shared/types";

const router = Router({ mergeParams: true });

type RepoParams = { repoId: string };
type IssueParams = { repoId: string; issueId: string };

// 议题列表
router.get("/", (req: Request<RepoParams>, res: Response) => {
  const repoId = req.params.repoId;
  const status = (req.query.status as string) || "all";
  res.json({ data: store.listIssues(repoId, status) });
});

// 议题详情
router.get("/:issueId", (req: Request<IssueParams>, res: Response) => {
  const issue = store.getIssue(req.params.repoId, req.params.issueId);
  if (!issue) {
    res.status(404).json({ message: "议题不存在" });
    return;
  }
  const comments = store.listComments("issue", issue.id);
  res.json({ data: { ...issue, comments } });
});

// 更新议题状态
router.patch("/:issueId", (req: Request<IssueParams>, res: Response) => {
  const { status } = req.body as { status: IssueStatus };
  const issue = store.updateIssueStatus(req.params.repoId, req.params.issueId, status);
  if (!issue) {
    res.status(404).json({ message: "议题不存在" });
    return;
  }
  res.json({ data: issue });
});

export default router;
