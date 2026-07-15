// 里程碑路由
import { Router } from "express";
import type { Request, Response } from "express";
import type { Milestone } from "@shared/types";

const router = Router();

const now = Date.now();
const day = 86400000;

const milestones: Milestone[] = [
  {
    id: "m1", repoId: "r1", title: "v2.4 发布",
    description: "看板拖拽稳定性、活动流性能优化、深色模式对比度修复。聚焦于评审体验的打磨。",
    dueDate: now + 3 * day, status: "open", progress: 68,
    openIssues: 4, closedIssues: 9, totalIssues: 13,
  },
  {
    id: "m2", repoId: "r1", title: "v2.5 规划",
    description: "PR 分屏 Diff、议题批量编辑、流水线日志搜索。下一阶段的能力扩展。",
    dueDate: now + 35 * day, status: "open", progress: 12,
    openIssues: 7, closedIssues: 1, totalIssues: 8,
  },
  {
    id: "m3", repoId: "r2", title: "性能优化冲刺",
    description: "首屏 LCP 优化、字体子集化、长列表虚拟滚动。",
    dueDate: now + 1 * day, status: "open", progress: 90,
    openIssues: 1, closedIssues: 9, totalIssues: 10,
  },
  {
    id: "m4", repoId: "r4", title: "文档完善",
    description: "Yohaku 设计令牌迁移指南、深色模式规范、CHEATSHEET 更新。",
    dueDate: now - 5 * day, status: "closed", progress: 100,
    openIssues: 0, closedIssues: 6, totalIssues: 6,
  },
  {
    id: "m5", repoId: "r2", title: "移动端适配",
    description: "响应式布局重构、触摸交互优化、PWA 支持。",
    dueDate: now + 60 * day, status: "open", progress: 5,
    openIssues: 8, closedIssues: 0, totalIssues: 8,
  },
];

// 所有里程碑
router.get("/", (_req: Request, res: Response) => {
  res.json({ data: milestones });
});

// 某仓库里程碑
router.get("/:repoId", (req: Request, res: Response) => {
  const filtered = milestones.filter((m) => m.repoId === req.params.repoId);
  res.json({ data: filtered });
});

export default router;
