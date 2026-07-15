// 议题路由
import { Router } from "express";
import { store } from "../db/store";
import type { IssueStatus } from "@shared/types";

const router = Router({ mergeParams: true });

// 议题列表
router.get("/", (req, res) => {
  const repoId = req.params.repoId;
  const status = (req.query.status as string) || "all";
  res.json({ data: store.listIssues(repoId, status) });
});

// 议题详情
router.get("/:issueId", (req, res) => {
  const issue = store.getIssue(req.params.repoId, req.params.issueId);
  if (!issue) {
    res.status(404).json({ message: "议题不存在" });
    return;
  }
  const comments = store.listComments("issue", issue.id);
  res.json({ data: { ...issue, comments } });
});

// 更新议题状态
router.patch("/:issueId", (req, res) => {
  const { status } = req.body as { status: IssueStatus };
  const issue = store.updateIssueStatus(req.params.repoId, req.params.issueId, status);
  if (!issue) {
    res.status(404).json({ message: "议题不存在" });
    return;
  }
  res.json({ data: issue });
});

export default router;
