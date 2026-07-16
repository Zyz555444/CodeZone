/**
 * CodeZone · 仓库路由
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { repoRepo, commitRepo, labelRepo } from "../repository.js";
import { authMiddleware } from "../auth.js";
import type { FileNode } from "@codezone/shared";

const router = Router();

// 仓库列表
router.get("/", async (_req: Request, res: Response) => {
  const repos = await repoRepo.list();
  res.json({ data: repos });
});

// 创建仓库
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const { name, description, visibility } = req.body as { name: string; description?: string; visibility?: "public" | "private" };
  if (!name) {
    res.status(400).json({ message: "仓库名称为必填" });
    return;
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(name)) {
    res.status(400).json({ message: "仓库名称仅支持字母、数字、_、.、- ,且首字符必须为字母或数字" });
    return;
  }
  const existing = await repoRepo.getByName(name);
  if (existing) {
    res.status(409).json({ message: "仓库名称已存在" });
    return;
  }
  const repo = await repoRepo.create({
    name,
    description: description ?? "",
    visibility: visibility ?? "private",
    ownerId: req.user!.id,
  });
  res.status(201).json({ data: repo });
});

// 仓库详情
router.get("/:repoId", async (req: Request<{ repoId: string }>, res: Response) => {
  const repo = await repoRepo.getById(req.params.repoId);
  if (!repo) {
    res.status(404).json({ message: "仓库不存在" });
    return;
  }
  res.json({ data: repo });
});

// 文件树 / 文件内容 (支持子路径深入)
// Express 5 (path-to-regexp v8): 命名通配符 *splat 替代裸 *, 通过 req.params.splat 访问
router.get(
  "/:repoId/contents/*splat",
  async (req: Request<{ repoId: string; splat?: string }>, res: Response) => {
    const repoId = req.params.repoId;
    const subPath = req.params.splat ?? "";
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
  },
);

// 提交历史
router.get("/:repoId/commits", async (req: Request<{ repoId: string }>, res: Response) => {
  const commits = await commitRepo.list(req.params.repoId);
  res.json({ data: commits });
});

// 仓库标签
router.get("/:repoId/labels", async (req: Request<{ repoId: string }>, res: Response) => {
  const labels = await labelRepo.listByRepo(req.params.repoId);
  res.json({ data: labels });
});

export default router;
