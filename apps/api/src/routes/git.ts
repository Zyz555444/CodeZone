/**
 * CodeZone · Git 操作路由
 *
 * GET    /git/:repoId/branches     → 获取分支列表
 * POST   /git/:repoId/branch       → 创建分支
 * DELETE /git/:repoId/branch/:name → 删除分支
 * POST   /git/:repoId/merge        → 合并分支
 * GET    /git/:repoId/diff/:base...:head → 分支对比
 * POST   /git/:repoId/clone        → 克隆仓库
 * POST   /git/:repoId/pull         → 拉取更新
 * POST   /git/:repoId/commit       → 提交变更
 * GET    /git/:repoId/status       → 仓库状态
 * GET    /git/:repoId/blame/:path  → 文件 blame
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { authMiddleware } from "../auth.js";
import { repoRepo, userRepo } from "../repository.js";

const router = Router();

const REPO_BASE = join(process.cwd(), ".repos");

// ─────────── 工具函数 ───────────
function git(cwd: string, args: string): string {
  return execSync(`git ${args}`, { cwd, encoding: "utf-8", timeout: 30000 }).trim();
}

function gitSafe(cwd: string, args: string): string | null {
  try {
    return git(cwd, args);
  } catch {
    return null;
  }
}

function repoDir(repoId: string): string {
  return join(REPO_BASE, repoId);
}

// ─────────── GET /branches — 获取分支列表 ───────────
router.get("/:repoId/branches", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.json({ data: { branches: [], current: "" } });
    return;
  }
  const raw = git(dir, "branch -a");
  const branches = raw.split("\n").map((b) => b.replace(/^\*?\s+/, "").replace("remotes/origin/", "")).filter((b) => b && !b.includes("HEAD"));
  const current = raw.split("\n").find((b) => b.startsWith("*"))?.replace("* ", "") ?? "";
  res.json({ data: { branches: [...new Set(branches)], current } });
});

// ─────────── POST /branch — 创建分支 ───────────
router.post("/:repoId/branch", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const { name, from } = req.body as { name: string; from?: string };
  if (!name) {
    res.status(400).json({ message: "分支名称为必填" });
    return;
  }
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.status(404).json({ message: "仓库尚未克隆" });
    return;
  }
  try {
    const base = from ?? git(dir, "rev-parse --abbrev-ref HEAD");
    git(dir, `checkout -b ${name} ${base}`);
    res.json({ data: { name, from: base } });
  } catch (err) {
    res.status(500).json({ message: `创建分支失败: ${(err as Error).message}` });
  }
});

// ─────────── DELETE /branch/:name — 删除分支 ───────────
router.delete("/:repoId/branch/:name", authMiddleware, async (req: Request<{ repoId: string; name: string }>, res: Response) => {
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.status(404).json({ message: "仓库尚未克隆" });
    return;
  }
  try {
    git(dir, `branch -D ${req.params.name}`);
    res.json({ data: { success: true } });
  } catch (err) {
    res.status(500).json({ message: `删除分支失败: ${(err as Error).message}` });
  }
});

// ─────────── POST /merge — 合并分支 ───────────
router.post("/:repoId/merge", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const { from, target } = req.body as { from: string; target?: string };
  if (!from) {
    res.status(400).json({ message: "源分支为必填" });
    return;
  }
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.status(404).json({ message: "仓库尚未克隆" });
    return;
  }
  try {
    const t = target ?? git(dir, "rev-parse --abbrev-ref HEAD");
    git(dir, `checkout ${t}`);
    git(dir, `merge ${from} --no-edit`);
    res.json({ data: { merged: from, into: t } });
  } catch (err) {
    // 尝试 abort
    gitSafe(dir, "merge --abort");
    res.status(500).json({ message: `合并失败, 可能有冲突: ${(err as Error).message}` });
  }
});

// ─────────── GET /diff/:base...:head — 分支差异 ───────────
router.get("/:repoId/diff/:base...:head", authMiddleware, async (req: Request<{ repoId: string; base: string; head: string }>, res: Response) => {
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.status(404).json({ message: "仓库尚未克隆" });
    return;
  }
  try {
    const diff = git(dir, `diff ${req.params.base}...${req.params.head} --stat`);
    const files = git(dir, `diff --name-only ${req.params.base}...${req.params.head}`);
    res.json({ data: { diff, files: files.split("\n").filter(Boolean) } });
  } catch (err) {
    res.status(500).json({ message: `获取差异失败: ${(err as Error).message}` });
  }
});

// ─────────── POST /clone — 克隆仓库 ───────────
router.post("/:repoId/clone", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const repo = await repoRepo.getById(req.params.repoId);
  if (!repo) {
    res.status(404).json({ message: "仓库不存在" });
    return;
  }
  const user = await userRepo.getById(req.user!.id);
  const { url } = req.body as { url?: string };
  const cloneUrl = url ?? `https://github.com/${repo.name}.git`;

  const dir = repoDir(req.params.repoId);
  if (existsSync(dir)) {
    res.json({ data: { message: "仓库已存在", path: dir } });
    return;
  }

  try {
    mkdirSync(REPO_BASE, { recursive: true });
    const env = user?.githubToken ? { GIT_ASKPASS: "echo", GIT_PASSWORD: user.githubToken } : {};
    execSync(`git clone ${cloneUrl} ${dir}`, { env: { ...process.env, ...env }, timeout: 120000 });
    res.json({ data: { message: "克隆成功", path: dir } });
  } catch (err) {
    res.status(500).json({ message: `克隆失败: ${(err as Error).message}` });
  }
});

// ─────────── POST /pull — 拉取更新 ───────────
router.post("/:repoId/pull", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.status(404).json({ message: "仓库尚未克隆" });
    return;
  }
  try {
    const output = git(dir, "pull --rebase");
    res.json({ data: { output } });
  } catch (err) {
    res.status(500).json({ message: `拉取失败: ${(err as Error).message}` });
  }
});

// ─────────── POST /commit — 提交变更 ───────────
router.post("/:repoId/commit", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const { message, files } = req.body as { message: string; files: { path: string; content: string }[] };
  if (!message || !files?.length) {
    res.status(400).json({ message: "提交信息和文件为必填" });
    return;
  }
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.status(404).json({ message: "仓库尚未克隆" });
    return;
  }
  try {
    for (const f of files) {
      const fp = join(dir, f.path);
      mkdirSync(join(fp, ".."), { recursive: true });
      writeFileSync(fp, f.content, "utf-8");
    }
    git(dir, "add -A");
    git(dir, `commit -m "${message.replace(/"/g, '\\"')}"`);
    res.json({ data: { message: "提交成功" } });
  } catch (err) {
    res.status(500).json({ message: `提交失败: ${(err as Error).message}` });
  }
});

// ─────────── GET /status — 仓库状态 ───────────
router.get("/:repoId/status", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.json({ data: { cloned: false, status: "", branch: "" } });
    return;
  }
  const status = gitSafe(dir, "status --porcelain") ?? "";
  const branch = gitSafe(dir, "rev-parse --abbrev-ref HEAD") ?? "";
  const ahead = gitSafe(dir, "rev-list --count HEAD..@{u} 2>/dev/null") ?? "0";
  const behind = gitSafe(dir, "rev-list --count @{u}..HEAD 2>/dev/null") ?? "0";
  res.json({
    data: {
      cloned: true,
      status,
      branch,
      ahead: parseInt(ahead),
      behind: parseInt(behind),
      dirty: status.length > 0,
    },
  });
});

// ─────────── GET /blame/:path — 文件 blame ───────────
router.get("/:repoId/blame/*splat", authMiddleware, async (req: Request<{ repoId: string; splat?: string }>, res: Response) => {
  const filePath = req.params.splat ?? "";
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir) || !filePath) {
    res.status(404).json({ message: "文件不存在" });
    return;
  }
  try {
    const output = git(dir, `blame --date=short -s ${filePath}`);
    const lines = output.split("\n").map((line) => {
      const match = line.match(/^(\w+)\s+\((.+?)\s+(\d{4}-\d{2}-\d{2})\s+\d+\)\s+(.*)$/);
      if (match) {
        return { sha: match[1], author: match[2], date: match[3], content: match[4] };
      }
      return { sha: "", author: "", date: "", content: line };
    });
    res.json({ data: lines });
  } catch (err) {
    res.status(500).json({ message: `获取 blame 失败: ${(err as Error).message}` });
  }
});

// ─────────── POST /push — 推送到远程 ───────────
router.post("/:repoId/push", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.status(404).json({ message: "仓库尚未克隆" });
    return;
  }
  try {
    const branch = git(dir, "rev-parse --abbrev-ref HEAD");
    const output = git(dir, `push origin ${branch}`);
    res.json({ data: { output, branch } });
  } catch (err) {
    res.status(500).json({ message: `推送失败: ${(err as Error).message}` });
  }
});

// ─────────── GET /graph — 提交图 ───────────
router.get("/:repoId/graph", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.json({ data: { log: "", branches: [] } });
    return;
  }
  const max = parseInt((req.query.max as string) ?? "30", 10);
  const log = gitSafe(dir, `log --oneline --graph --decorate -- -${max}`) ?? "";
  const branches = gitSafe(dir, "branch -a --format='%(refname:short)'")?.split("\n").filter(Boolean) ?? [];
  res.json({ data: { log, branches } });
});

// ─────────── POST /file — 写文件 ───────────
router.post("/:repoId/file", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const { path, content } = req.body as { path: string; content: string };
  if (!path) {
    res.status(400).json({ message: "文件路径必填" });
    return;
  }
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.status(404).json({ message: "仓库尚未克隆" });
    return;
  }
  try {
    const fp = join(dir, path);
    mkdirSync(join(fp, ".."), { recursive: true });
    writeFileSync(fp, content, "utf-8");
    res.json({ data: { path, written: true } });
  } catch (err) {
    res.status(500).json({ message: `写入文件失败: ${(err as Error).message}` });
  }
});

// ─────────── DELETE /file — 删除文件 ───────────
router.delete("/:repoId/file", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const { path } = req.body as { path: string };
  if (!path) {
    res.status(400).json({ message: "文件路径必填" });
    return;
  }
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.status(404).json({ message: "仓库尚未克隆" });
    return;
  }
  try {
    const { rmSync } = await import("node:fs");
    rmSync(join(dir, path), { recursive: true, force: true });
    res.json({ data: { path, deleted: true } });
  } catch (err) {
    res.status(500).json({ message: `删除文件失败: ${(err as Error).message}` });
  }
});
export default router;