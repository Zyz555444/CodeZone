/**
 * CodeZone · 仓库路由
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { repoRepo, commitRepo, labelRepo } from "../repository.js";
import type { FileNode } from "@codezone/shared";

const router = Router();

// 仓库列表
router.get("/", async (_req: Request, res: Response) => {
  const repos = await repoRepo.list();
  res.json({ data: repos });
});

// 仓库详情
router.get("/:repoId", async (req: Request, res: Response) => {
  const repo = await repoRepo.getById(req.params.repoId);
  if (!repo) {
    res.status(404).json({ message: "仓库不存在" });
    return;
  }
  res.json({ data: repo });
});

// 文件树 / 文件内容 (支持子路径深入)
router.get("/:repoId/contents/*", async (req: Request, res: Response) => {
  const repoId = req.params.repoId;
  const subPath = req.params[0] || "";
  const tree = await repoRepo.getFileTree(repoId);

  if (!subPath) {
    res.json({ data: tree });
    return;
  }

  // 按路径查找节点
  const findNode = (nodes: FileNode[], path: string): FileNode | null => {
    const parts = path.split("/").filter(Boolean);
    let current: FileNode | null = null;
    let pool = nodes;
    for (const part of parts) {
      current = pool.find((n) => n.name === part) ?? null;
      if (!current) return null;
      pool = current.children ?? [];
    }
    return current;
  };

  const node = findNode(tree, subPath);
  if (!node) {
    res.status(404).json({ message: "路径不存在" });
    return;
  }
  res.json({ data: node });
});

// 提交历史
router.get("/:repoId/commits", async (req: Request, res: Response) => {
  const commits = await commitRepo.list(req.params.repoId);
  res.json({ data: commits });
});

// 仓库标签
router.get("/:repoId/labels", async (req: Request, res: Response) => {
  const labels = await labelRepo.listByRepo(req.params.repoId);
  res.json({ data: labels });
});

export default router;
