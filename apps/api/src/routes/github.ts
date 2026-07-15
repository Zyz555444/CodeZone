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
    let user = await userRepo.getByEmail(primaryEmail);
    if (!user) {
      const id = `u${Date.now()}`;
      user = await userRepo.create({
        id,
        name: ghUser.name ?? ghUser.login,
        email: primaryEmail,
        passwordHash: null as unknown as string,
        avatar: ghUser.avatar_url,
      });
    }

    // 更新 GitHub token
    const { db, schema } = await import("@codezone/database");
    const { eq } = await import("drizzle-orm");
    await db.update(schema.users)
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

export default router;