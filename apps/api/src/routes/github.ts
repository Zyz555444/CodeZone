/**
 * CodeZone · GitHub 集成路由
 *
 * GET  /auth/github          → 重定向到 GitHub OAuth 授权页
 * GET  /auth/github/callback → OAuth 回调, 关联用户
 * GET  /github/repos         → 获取用户 GitHub 仓库列表
 * POST /github/import        → 导入 GitHub 仓库到 CodeZone
 * GET  /github/connected     → 检查用户是否已连接 GitHub
 * POST /github/disconnect    → 断开 GitHub 连接
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { config } from "../config.js";
import { userRepo, repoRepo } from "../repository.js";
import { signToken, authMiddleware, type AuthUser } from "../auth.js";
import { Octokit } from "octokit";

const router = Router();

// ─────────── GET /auth/github — 重定向到 GitHub OAuth ───────────
router.get("/auth/github", (_req: Request, res: Response) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${config.githubClientId}&redirect_uri=${encodeURIComponent(config.githubRedirectUri)}&scope=repo,user`;
  res.redirect(url);
});

// ─────────── GET /auth/github/callback — OAuth 回调 ───────────
router.get("/auth/github/callback", async (req: Request, res: Response) => {
  const { code } = req.query as { code?: string };
  if (!code) {
    res.status(400).json({ message: "缺少授权码" });
    return;
  }

  try {
    // 用 code 换取 access_token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      res.status(400).json({ message: tokenData.error ?? "获取 token 失败" });
      return;
    }

    // 获取 GitHub 用户信息
    const octokit = new Octokit({ auth: tokenData.access_token });
    const { data: ghUser } = await octokit.rest.users.getAuthenticated();
    // 获取邮箱
    const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser();
    const primaryEmail = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? `${ghUser.login}@github.com`;

    // 查找或创建用户
    const user = await userRepo.getByEmail(primaryEmail) ?? await userRepo.create({
      id: `u${Date.now()}`,
      name: ghUser.login,
      email: primaryEmail,
      passwordHash: null,
      avatar: ghUser.avatar_url,
    });

    // 更新 GitHub token
    const { db, schema } = await import("@codezone/database");
    const { eq } = await import("drizzle-orm");
    await (db.update(schema.users) as any)
      .set({ githubToken: tokenData.access_token, githubUsername: ghUser.login, avatar: ghUser.avatar_url })
      .where(eq(schema.users.id, user.id));

    // 签发 JWT
    const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    const token = signToken(authUser);

    // 重定向到前端, 附带 token
    const frontendUrl = `${config.corsOrigin}/login?token=${token}`;
    res.redirect(frontendUrl);
  } catch (err) {
    console.error("[github] OAuth callback error:", err);
    res.status(500).json({ message: "GitHub 授权失败" });
  }
});

// ─────────── GET /github/connected — 检查连接状态 ───────────
router.get("/github/connected", authMiddleware, async (req: Request, res: Response) => {
  const user = await userRepo.getById(req.user!.id);
  res.json({ data: { connected: !!user?.githubToken, githubUsername: user?.githubUsername ?? null } });
});

// ─────────── POST /github/disconnect — 断开 GitHub ───────────
router.post("/github/disconnect", authMiddleware, async (req: Request, res: Response) => {
  const { db, schema } = await import("@codezone/database");
  const { eq } = await import("drizzle-orm");
  await db.update(schema.users)
    .set({ githubToken: null, githubUsername: null })
    .where(eq(schema.users.id, req.user!.id));
  res.json({ data: { success: true } });
});

// ─────────── GET /github/repos — 获取用户 GitHub 仓库列表 ───────────
router.get("/github/repos", authMiddleware, async (req: Request, res: Response) => {
  const user = await userRepo.getById(req.user!.id);
  if (!user?.githubToken) {
    res.status(400).json({ message: "请先连接 GitHub 账号" });
    return;
  }
  try {
    const octokit = new Octokit({ auth: user.githubToken });
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
      affiliation: "owner,collaborator,organization_member",
    });
    const simplified = repos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      defaultBranch: r.default_branch,
      private: r.private,
      updatedAt: new Date(r.updated_at ?? "").getTime(),
      cloneUrl: r.clone_url,
      htmlUrl: r.html_url,
    }));
    res.json({ data: simplified });
  } catch (err) {
    console.error("[github] list repos error:", err);
    res.status(500).json({ message: "获取仓库列表失败" });
  }
});

// ─────────── POST /github/import — 导入 GitHub 仓库 ───────────
router.post("/github/import", authMiddleware, async (req: Request, res: Response) => {
  const user = await userRepo.getById(req.user!.id);
  if (!user?.githubToken) {
    res.status(400).json({ message: "请先连接 GitHub 账号" });
    return;
  }
  const { fullName } = req.body as { fullName: string };
  if (!fullName) {
    res.status(400).json({ message: "仓库名称 (owner/repo) 为必填" });
    return;
  }

  try {
    const octokit = new Octokit({ auth: user.githubToken });
    const [owner, reponame] = fullName.split("/");
    const { data: ghRepo } = await octokit.rest.repos.get({ owner, repo: reponame });

    // 检查是否已导入
    const existingRepos = await repoRepo.list();
    const alreadyImported = existingRepos.find((r) => r.name === fullName);
    if (alreadyImported) {
      res.status(409).json({ message: "该仓库已存在", data: alreadyImported });
      return;
    }

    // 创建 CodeZone 仓库
    const id = `r${Date.now()}`;
    const { db, schema } = await import("@codezone/database");
    await db.insert(schema.repos).values({
      id,
      name: fullName,
      description: ghRepo.description ?? "",
      language: ghRepo.language ?? "",
      languageColor: ghRepo.language ? getLanguageColor(ghRepo.language) : "#787670",
      stars: ghRepo.stargazers_count,
      defaultBranch: ghRepo.default_branch,
      ownerId: req.user!.id,
      updatedAt: Date.now(),
      openIssues: ghRepo.open_issues_count,
      openPRs: 0,
    } as any);

    const repo = await repoRepo.getById(id);
    res.status(201).json({ data: repo });
  } catch (err) {
    console.error("[github] import repo error:", err);
    res.status(500).json({ message: "导入仓库失败" });
  }
});

// ─────────── 语言颜色映射 ───────────
const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  Ruby: "#701516",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  PHP: "#4F5D95",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Dart: "#00B4AB",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Lua: "#000080",
  Scala: "#c22d40",
  R: "#198CE7",
  Dockerfile: "#384d54",
  Markdown: "#083fa1",
};

function getLanguageColor(lang: string): string {
  return languageColors[lang] ?? "#787670";
}


// ─────────── POST /github/sync-issues — 同步 GitHub Issues 到 CodeZone ───────────
router.post("/github/sync-issues", authMiddleware, async (req: Request, res: Response) => {
  const user = await userRepo.getById(req.user!.id);
  if (!user?.githubToken) {
    res.status(400).json({ message: "请先连接 GitHub 账号" });
    return;
  }
  const { repoId } = req.body as { repoId: string };
  const repo = await repoRepo.getById(repoId);
  if (!repo) {
    res.status(404).json({ message: "仓库不存在" });
    return;
  }
  try {
    const octokit = new Octokit({ auth: user.githubToken });
    const [owner, reponame] = repo.name.split("/");
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner, repo: reponame, state: "all", per_page: 50,
    });
    const { db, schema } = await import("@codezone/database");
    const { eq } = await import("drizzle-orm");
    let synced = 0;
    for (const issue of issues) {
      if (issue.pull_request) continue; // skip PRs
      const existing = await db.select().from(schema.issues)
        .where(eq(schema.issues.id, `i_gh_${issue.number}`)).limit(1);
      if (existing.length > 0) {
        // update
        await db.update(schema.issues).set({
          title: issue.title,
          status: issue.state === "closed" ? "closed" as any : "open" as any,
          updatedAt: new Date(issue.updated_at).getTime(),
        }).where(eq(schema.issues.id, `i_gh_${issue.number}`));
      } else {
        // create
        await db.insert(schema.issues).values({
          id: `i_gh_${issue.number}`,
          repoId: repo.id,
          title: issue.title,
          description: issue.body ?? "",
          status: "open" as any,
          authorId: req.user!.id,
          updatedAt: new Date(issue.updated_at).getTime(),
        } as any);
        synced++;
      }
    }
    res.json({ data: { synced, total: issues.length } });
  } catch (err) {
    console.error("[github] sync issues error:", err);
    res.status(500).json({ message: "同步 Issues 失败" });
  }
});

// ─────────── POST /github/sync-pulls — 同步 GitHub PRs 到 CodeZone ───────────
router.post("/github/sync-pulls", authMiddleware, async (req: Request, res: Response) => {
  const user = await userRepo.getById(req.user!.id);
  if (!user?.githubToken) {
    res.status(400).json({ message: "请先连接 GitHub 账号" });
    return;
  }
  const { repoId } = req.body as { repoId: string };
  const repo = await repoRepo.getById(repoId);
  if (!repo) {
    res.status(404).json({ message: "仓库不存在" });
    return;
  }
  try {
    const octokit = new Octokit({ auth: user.githubToken });
    const [owner, reponame] = repo.name.split("/");
    const { data: pulls } = await octokit.rest.pulls.list({
      owner, repo: reponame, state: "all", per_page: 50,
    });
    const { db, schema } = await import("@codezone/database");
    const { eq } = await import("drizzle-orm");
    let synced = 0;
    for (const pr of pulls) {
      const prStatus = pr.merged_at ? "merged" : pr.state === "closed" ? "closed" : "open";
      const existing = await db.select().from(schema.pullRequests)
        .where(eq(schema.pullRequests.id, `pr_gh_${pr.number}`)).limit(1);
      if (existing.length > 0) {
        await db.update(schema.pullRequests).set({
          title: pr.title,
          status: prStatus as any,
          updatedAt: new Date(pr.updated_at).getTime(),
        }).where(eq(schema.pullRequests.id, `pr_gh_${pr.number}`));
      } else {
        await db.insert(schema.pullRequests).values({
          id: `pr_gh_${pr.number}`,
          repoId: repo.id,
          title: pr.title,
          description: pr.body ?? "",
          status: prStatus as any,
          sourceBranch: pr.head.ref,
          targetBranch: pr.base.ref,
          authorId: req.user!.id,
          updatedAt: new Date(pr.updated_at).getTime(),
        } as any);
        synced++;
      }
    }
    res.json({ data: { synced, total: pulls.length } });
  } catch (err) {
    console.error("[github] sync pulls error:", err);
    res.status(500).json({ message: "同步 PRs 失败" });
  }
});

// ─────────── POST /github/sync-commits — 同步 GitHub Commits 到 CodeZone ───────────
router.post("/github/sync-commits", authMiddleware, async (req: Request, res: Response) => {
  const user = await userRepo.getById(req.user!.id);
  if (!user?.githubToken) {
    res.status(400).json({ message: "请先连接 GitHub 账号" });
    return;
  }
  const { repoId } = req.body as { repoId: string };
  const repo = await repoRepo.getById(repoId);
  if (!repo) {
    res.status(404).json({ message: "仓库不存在" });
    return;
  }
  try {
    const octokit = new Octokit({ auth: user.githubToken });
    const [owner, reponame] = repo.name.split("/");
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner, repo: reponame, per_page: 50,
    });
    const { db, schema } = await import("@codezone/database");
    const { eq } = await import("drizzle-orm");
    let synced = 0;
    for (const commit of commits) {
      const existing = await db.select().from(schema.commits)
        .where(eq(schema.commits.id, commit.sha)).limit(1);
      if (existing.length === 0) {
        await db.insert(schema.commits).values({
          id: commit.sha,
          repoId: repo.id,
          message: commit.commit.message.split("\n")[0],
          authorName: commit.commit.author?.name ?? "unknown",
          additions: commit.stats?.additions ?? 0,
          deletions: commit.stats?.deletions ?? 0,
          createdAt: new Date(commit.commit.author?.date ?? "").getTime(),
        } as any);
        synced++;
      }
    }
    // 更新仓库 openIssues
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo: reponame });
    await (db.update(schema.repos) as any).set({
      openIssues: repoData.open_issues_count,
      updatedAt: Date.now(),
    }).where(eq(schema.repos.id, repoId));
    res.json({ data: { synced, total: commits.length } });
  } catch (err) {
    console.error("[github] sync commits error:", err);
    res.status(500).json({ message: "同步 Commits 失败" });
  }
});

// ─────────── POST /github/create-pr — 创建 GitHub PR ───────────
router.post("/github/create-pr", authMiddleware, async (req: Request, res: Response) => {
  const user = await userRepo.getById(req.user!.id);
  if (!user?.githubToken) {
    res.status(400).json({ message: "请先连接 GitHub 账号" });
    return;
  }
  const { repoId, title, head, base, body } = req.body as {
    repoId: string; title: string; head: string; base: string; body?: string;
  };
  if (!title || !head || !base) {
    res.status(400).json({ message: "标题、源分支、目标分支为必填" });
    return;
  }
  const repo = await repoRepo.getById(repoId);
  if (!repo) {
    res.status(404).json({ message: "仓库不存在" });
    return;
  }
  try {
    const octokit = new Octokit({ auth: user.githubToken });
    const [owner, reponame] = repo.name.split("/");
    const { data: pr } = await octokit.rest.pulls.create({
      owner, repo: reponame, title, head, base, body: body ?? "",
    });
    res.json({ data: {
      url: pr.html_url,
      number: pr.number,
      title: pr.title,
      state: pr.state,
    } });
  } catch (err) {
    console.error("[github] create PR error:", err);
    res.status(500).json({ message: `创建 PR 失败: ${(err as Error).message}` });
  }
});
export default router;