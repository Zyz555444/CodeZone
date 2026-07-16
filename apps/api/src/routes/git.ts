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
import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, relative } from "node:path";
import { promisify } from "node:util";
import { authMiddleware } from "../auth.js";
import { repoRepo, userRepo } from "../repository.js";

const execFileAsync = promisify(execFile);

const router = Router();

// 把 err 转为安全字符串,避免模板里 (err as Error).message 在某些 TS 版本下解析失败
function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const REPO_BASE = join(process.cwd(), ".repos");

// 分支/引用名合法性校验 — 阻止命令注入与路径穿越
const REF_RE = /^[A-Za-z0-9][A-Za-z0-9._/\-]{0,63}$/;
function assertRef(name: string, label = "名称"): void {
  if (!name || !REF_RE.test(name)) {
    throw new Error(label + "不合法");
  }
}

// 校验文件路径落在仓库目录内,阻止 ../../ 路径穿越
function safePath(dir: string, p: string): string {
  if (!p || p.includes("\0")) throw new Error("路径不合法");
  const abs = resolve(dir, p);
  const rel = relative(dir, abs);
  if (rel.startsWith("..") || rel === "") throw new Error("路径越界");
  return abs;
}

// ─────────── 工具函数 ───────────
// 使用 execFileSync + 数组参数,不经过 shell,杜绝命令注入
function git(cwd: string, args: string[], opts: { timeout?: number; env?: NodeJS.ProcessEnv } = {}): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    timeout: opts.timeout ?? 30000,
    shell: false,
    env: opts.env ?? process.env,
  }).trim();
}

function gitSafe(cwd: string, args: string[]): string | null {
  try {
    return git(cwd, args);
  } catch {
    return null;
  }
}

function repoDir(repoId: string): string {
  return join(REPO_BASE, repoId);
}

/**
 * 为带认证的 Git 操作准备环境变量与临时凭据文件。
 * 通过 GIT_ASKPASS + GIT_CONFIG_KEY/GIT_CONFIG_VALUE 让 token 走 Git 凭据机制,
 * 而不是出现在 URL / 命令行参数 / 进程列表里。
 * 返回的 cleanup() 在使用完毕后必须调用,以清理临时文件。
 */
interface AuthHandle {
  env: NodeJS.ProcessEnv;
  cleanup: () => void;
}

function buildAuthEnv(token: string | undefined): AuthHandle {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
  if (!token) {
    return { env, cleanup: () => {} };
  }

  // 临时 askpass 脚本,仅 echo 用户名/token,避免明文落盘到进程列表
  const dir = mkdtempSync(join(tmpdir(), "cz-git-"));
  const helperPath = join(dir, "askpass.sh");
  // 用 printf %s 避免 echo 在带特殊字符时出问题
  // 转义单引号: ' => '\''  (POSIX shell 标准转义)
  const escaped = token.replace(/'/g, "'\\''");
  // 每一行单独写,避免模板里出现 * ) ; 等字符触发解析
  const lines = [
    "#!/bin/sh",
    "case \"$1\" in",
    "  Username" + "*) printf '%s' 'x-access-token' ;;",
    "  " + "*" + ") printf '%s' '" + escaped + "' ;;",
    "esac",
    "",
  ];
  const script = lines.join("\n");
  writeFileSync(helperPath, script, { mode: 0o600 });

  env.GIT_ASKPASS = helperPath;
  // Git 在未关联 tty 时若 GIT_ASKPASS 未设置,可能直接失败;此处显式指定
  return {
    env,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* 忽略 */
      }
    },
  };
}

// ─────────── GET /branches — 获取分支列表 ───────────
router.get("/:repoId/branches", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.json({ data: { branches: [], current: "" } });
    return;
  }
  try {
    const raw = git(dir, ["branch", "-a"]);
    const branches = raw.split("\n").map((b) => b.replace(/^\*?\s+/, "").replace("remotes/origin/", "")).filter((b) => b && !b.includes("HEAD"));
    const current = raw.split("\n").find((b) => b.startsWith("*"))?.replace("* ", "") ?? "";
    res.json({ data: { branches: [...new Set(branches)], current } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ message: "获取分支失败: " + msg });
  }
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
    assertRef(name, "分支名称");
    const base = from ?? git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]);
    if (from) assertRef(from, "起点分支");
    git(dir, ["checkout", "-b", name, base]);
    res.json({ data: { name, from: base } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ message: "创建分支失败: " + msg });
  }
});

// ─────────── POST /checkout — 切换分支 ───────────
router.post("/:repoId/checkout", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const { branch } = req.body as { branch: string };
  if (!branch) {
    res.status(400).json({ message: "分支名称为必填" });
    return;
  }
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.status(404).json({ message: "仓库尚未克隆" });
    return;
  }
  try {
    assertRef(branch, "分支名称");
    // 拒绝在脏工作区切换,避免误丢修改
    const status = gitSafe(dir, ["status", "--porcelain"]) ?? "";
    if (status.length > 0) {
      res.status(409).json({ message: "工作区有未提交修改,请先提交或暂存后再切换分支" });
      return;
    }
    git(dir, ["checkout", branch]);
    res.json({ data: { branch } });
  } catch (err) {
    res.status(500).json({ message: "切换分支失败: " + errMsg(err) });
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
    assertRef(req.params.name, "分支名称");
    git(dir, ["branch", "-D", req.params.name]);
    res.json({ data: { success: true } });
  } catch (err) {
    res.status(500).json({ message: "删除分支失败: " + errMsg(err) });
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
    assertRef(from, "源分支");
    const t = target ?? git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]);
    if (target) assertRef(target, "目标分支");
    git(dir, ["checkout", t]);
    git(dir, ["merge", from, "--no-edit"]);
    res.json({ data: { merged: from, into: t } });
  } catch (err) {
    // 尝试 abort
    gitSafe(dir, ["merge", "--abort"]);
    res.status(500).json({ message: "合并失败, 可能有冲突: " + errMsg(err) });
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
    assertRef(req.params.base, "base 分支");
    assertRef(req.params.head, "head 分支");
    const diff = git(dir, ["diff", req.params.base + "..." + req.params.head, "--stat"]);
    const files = git(dir, ["diff", "--name-only", req.params.base + "..." + req.params.head]);
    res.json({ data: { diff, files: files.split("\n").filter(Boolean) } });
  } catch (err) {
    res.status(500).json({ message: "获取差异失败: " + errMsg(err) });
  }
});

// ─────────── POST /clone — 克隆仓库 ───────────
router.post("/:repoId/clone", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const repo = await repoRepo.getById(req.params.repoId);
  if (!repo) {
    res.status(404).json({ message: "仓库不存在" });
    return;
  }
  const user = await userRepo.getByIdWithCredentials(req.user!.id);
  const { url } = req.body as { url?: string };
  // 仅允许 https GitHub URL 或基于仓库名构造的 URL,阻止任意 URL 命令注入
  const cloneUrl = url ?? "https://github.com/" + repo.name + ".git";
  if (!/^https:\/\/github\.com\//.test(cloneUrl)) {
    res.status(400).json({ message: "仅支持 https GitHub 仓库 URL" });
    return;
  }

  const dir = repoDir(req.params.repoId);
  if (existsSync(dir)) {
    res.json({ data: { message: "仓库已存在", path: dir } });
    return;
  }

  // token 通过 GIT_ASKPASS 走凭据机制,绝不在 URL/命令行/进程列表里出现
  const { env, cleanup } = buildAuthEnv(user?.githubToken ?? undefined);
  try {
    mkdirSync(REPO_BASE, { recursive: true });
    await execFileAsync("git", ["clone", cloneUrl, dir], {
      env,
      timeout: 120000,
      shell: false,
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });
    res.json({ data: { message: "克隆成功", path: dir } });
  } catch (err) {
    res.status(500).json({ message: "克隆失败: " + errMsg(err) });
  } finally {
    cleanup();
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
    const user = await userRepo.getByIdWithCredentials(req.user!.id);
    const { env, cleanup } = buildAuthEnv(user?.githubToken ?? undefined);
    try {
      const { stdout } = await execFileAsync("git", ["pull", "--rebase"], {
        cwd: dir,
        env,
        timeout: 60000,
        shell: false,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
      });
      res.json({ data: { output: stdout.trim() } });
    } finally {
      cleanup();
    }
  } catch (err) {
    res.status(500).json({ message: "拉取失败: " + errMsg(err) });
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
      const fp = safePath(dir, f.path);
      mkdirSync(join(fp, ".."), { recursive: true });
      writeFileSync(fp, f.content, "utf-8");
    }
    git(dir, ["add", "-A"]);
    // 用 -F 从 stdin 读取 message,或用数组参数避免 shell 注入
    git(dir, ["commit", "-m", message]);
    res.json({ data: { message: "提交成功" } });
  } catch (err) {
    res.status(500).json({ message: "提交失败: " + errMsg(err) });
  }
});

// ─────────── GET /status — 仓库状态 ───────────
router.get("/:repoId/status", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.json({ data: { cloned: false, status: "", branch: "" } });
    return;
  }
  const status = gitSafe(dir, ["status", "--porcelain"]) ?? "";
  const branch = gitSafe(dir, ["rev-parse", "--abbrev-ref", "HEAD"]) ?? "";
  // HEAD..@{u} = 远端领先本地 = behind; @{u}..HEAD = 本地领先远端 = ahead
  const ahead = gitSafe(dir, ["rev-list", "--count", "@{u}..HEAD"]) ?? "0";
  const behind = gitSafe(dir, ["rev-list", "--count", "HEAD..@{u}"]) ?? "0";
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
    // 校验文件路径落在仓库内
    safePath(dir, filePath);
    const output = git(dir, ["blame", "--date=short", "-s", filePath]);
    const lines = output.split("\n").map((line) => {
      const match = line.match(/^(\w+)\s+\((.+?)\s+(\d{4}-\d{2}-\d{2})\s+\d+\)\s+(.*)$/);
      if (match) {
        // 对齐前端契约:字段名为 line (行内容)
        return { sha: match[1], author: match[2], date: match[3], line: match[4] };
      }
      return { sha: "", author: "", date: "", line: line };
    });
    res.json({ data: lines });
  } catch (err) {
    res.status(500).json({ message: "获取 blame 失败: " + errMsg(err) });
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
    const branch = git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]);
    assertRef(branch, "当前分支");
    const user = await userRepo.getByIdWithCredentials(req.user!.id);
    const { env, cleanup } = buildAuthEnv(user?.githubToken ?? undefined);
    try {
      const { stdout } = await execFileAsync("git", ["push", "origin", branch], {
        cwd: dir,
        env,
        timeout: 60000,
        shell: false,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
      });
      res.json({ data: { output: stdout.trim(), branch } });
    } finally {
      cleanup();
    }
  } catch (err) {
    res.status(500).json({ message: "推送失败: " + errMsg(err) });
  }
});

// ─────────── GET /graph — 提交图 ───────────
router.get("/:repoId/graph", authMiddleware, async (req: Request<{ repoId: string }>, res: Response) => {
  const dir = repoDir(req.params.repoId);
  if (!existsSync(dir)) {
    res.json({ data: { log: "", branches: [] } });
    return;
  }
  const max = Math.min(Math.max(parseInt((req.query.max as string) ?? "30", 10) || 30, 1), 200);
  // -n 限制提交数,而非 pathspec
  const log = gitSafe(dir, ["log", "-n" + max, "--oneline", "--graph", "--decorate"]) ?? "";
  const branches = gitSafe(dir, ["branch", "-a", "--format=%(refname:short)"])?.split("\n").filter(Boolean) ?? [];
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
    const fp = safePath(dir, path);
    mkdirSync(join(fp, ".."), { recursive: true });
    writeFileSync(fp, content, "utf-8");
    res.json({ data: { path, written: true } });
  } catch (err) {
    res.status(500).json({ message: "写入文件失败: " + errMsg(err) });
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
    const fp = safePath(dir, path);
    rmSync(fp, { recursive: true, force: true });
    res.json({ data: { path, deleted: true } });
  } catch (err) {
    res.status(500).json({ message: "删除文件失败: " + errMsg(err) });
  }
});
export default router;