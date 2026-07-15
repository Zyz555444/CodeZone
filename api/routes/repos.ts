// 仓库路由
import { Router } from "express";
import { store } from "../db/store";

const router = Router();

// 仓库列表
router.get("/", (_req, res) => {
  res.json({ data: store.listRepos() });
});

// 仓库详情
router.get("/:repoId", (req, res) => {
  const repo = store.getRepo(req.params.repoId);
  if (!repo) {
    res.status(404).json({ message: "仓库不存在" });
    return;
  }
  res.json({ data: repo });
});

// 文件树
router.get("/:repoId/contents/*", (req, res) => {
  const repoId = req.params.repoId;
  const tree = store.getFileTree(repoId);
  if (!tree) {
    res.json({ data: [] });
    return;
  }
  // 支持按路径深入子目录
  const subPath = req.params[0];
  if (!subPath) {
    res.json({ data: tree });
    return;
  }
  const parts = subPath.split("/");
  let current: any = { children: tree };
  for (const part of parts) {
    current = current.children?.find((n: any) => n.name === part);
    if (!current) {
      res.json({ data: null });
      return;
    }
  }
  res.json({ data: current });
});

// 提交历史
router.get("/:repoId/commits", (req, res) => {
  res.json({ data: store.listCommits(req.params.repoId) });
});

export default router;
