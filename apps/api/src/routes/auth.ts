/**
 * CodeZone · 认证路由
 * POST /register · POST /login · GET /me · POST /logout
 * POST /register-admin · POST /join-by-invite
 */
import { Router } from "express";
import type { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import { Octokit } from "octokit";
import { userRepo, teamRepo, teamMemberRepo, inviteCodeRepo } from "../repository.js";
import { signToken, authMiddleware, findOrCreateOAuthUser, oauthCallbackRedirect, type AuthUser } from "../auth.js";
import { config } from "../config.js";

const router = Router();

// bcrypt 工作因子:12 在 2024+ 硬件下是 OWASP 推荐的下限
const BCRYPT_ROUNDS = 12;

// 公共配置 — 不需要 token,前端用于决定是否显示 OAuth 按钮
router.get("/providers", async (_req: Request, res: Response) => {
  res.json({
    data: {
      github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  });
});

// 注册
router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };
  if (!name || !email || !password) {
    res.status(400).json({ message: "姓名、邮箱、密码均为必填" });
    return;
  }
  const existing = await userRepo.getByEmail(email);
  if (existing) {
    res.status(409).json({ message: "该邮箱已注册" });
    return;
  }
  const passwordHash = await bcryptjs.hash(password, BCRYPT_ROUNDS);
  const id = `u${Date.now()}`;
  const user = await userRepo.create({ id, name, email, passwordHash });
  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(authUser);
  res.status(201).json({ data: { user, token } });
});

// 团队管理员注册 — 创建团队并注册为 owner
router.post("/register-admin", async (req: Request, res: Response) => {
  const { name, email, password, teamName } = req.body as {
    name: string; email: string; password: string; teamName: string;
  };
  if (!name || !email || !password || !teamName) {
    res.status(400).json({ message: "姓名、邮箱、密码、团队名称均为必填" });
    return;
  }
  const existing = await userRepo.getByEmail(email);
  if (existing) {
    res.status(409).json({ message: "该邮箱已注册" });
    return;
  }
  const passwordHash = await bcryptjs.hash(password, BCRYPT_ROUNDS);
  const userId = `u${Date.now()}`;
  const user = await userRepo.create({ id: userId, name, email, passwordHash, role: "admin" });
  const team = await teamRepo.create({ name: teamName, ownerId: userId });
  await teamMemberRepo.add({ teamId: team.id, userId, role: "owner" });
  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(authUser);
  res.status(201).json({ data: { user, token, team } });
});

// 通过邀请码注册加入团队
router.post("/join-by-invite", async (req: Request, res: Response) => {
  const { name, email, password, inviteCode } = req.body as {
    name: string; email: string; password: string; inviteCode: string;
  };
  if (!name || !email || !password || !inviteCode) {
    res.status(400).json({ message: "姓名、邮箱、密码、邀请码均为必填" });
    return;
  }
  const ic = await inviteCodeRepo.getByCode(inviteCode);
  if (!ic) {
    res.status(400).json({ message: "邀请码无效" });
    return;
  }
  if (ic.expiresAt && ic.expiresAt < Date.now()) {
    res.status(400).json({ message: "邀请码已过期" });
    return;
  }
  if (ic.maxUses > 0 && ic.usedCount >= ic.maxUses) {
    res.status(400).json({ message: "邀请码已用完" });
    return;
  }
  const existing = await userRepo.getByEmail(email);
  if (existing) {
    res.status(409).json({ message: "该邮箱已注册" });
    return;
  }
  const passwordHash = await bcryptjs.hash(password, BCRYPT_ROUNDS);
  const userId = `u${Date.now()}`;
  const user = await userRepo.create({ id: userId, name, email, passwordHash });
  await teamMemberRepo.add({ teamId: ic.teamId, userId, role: "member" });
  await inviteCodeRepo.incrementUsed(ic.id);
  const team = await teamRepo.getById(ic.teamId);
  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(authUser);
  res.status(201).json({ data: { user, token, team } });
});

// 登录
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ message: "邮箱与密码均为必填" });
    return;
  }
  const user = await userRepo.getByEmail(email);
  if (!user || !user.passwordHash) {
    res.status(401).json({ message: "邮箱或密码错误" });
    return;
  }
  const valid = await bcryptjs.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "邮箱或密码错误" });
    return;
  }
  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(authUser);
  const { passwordHash: _ph, ...safeUser } = user;
  // 附上团队信息
  const membership = await teamMemberRepo.getByUser(user.id);
  const team = membership ? await teamRepo.getById(membership.teamId) : null;
  res.json({ data: { user: safeUser, token, team, teamRole: membership?.role ?? null } });
});

// 获取当前用户
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  const user = await userRepo.getById(req.user!.id);
  if (!user) {
    res.status(404).json({ message: "用户不存在" });
    return;
  }
  const membership = await teamMemberRepo.getByUser(user.id);
  const team = membership ? await teamRepo.getById(membership.teamId) : null;
  res.json({ data: { ...user, team, teamRole: membership?.role ?? null } });
});

// 登出 (JWT 无状态,前端丢弃 token 即可)
router.post("/logout", (_req: Request, res: Response) => {
  res.json({ data: { success: true } });
});

// ─────────── GitHub OAuth ───────────

// GET /auth/github — 重定向到 GitHub 授权页
router.get("/github", (_req: Request, res: Response) => {
  if (!config.githubClientId) {
    res.status(503).json({ message: "GitHub 登录未配置" });
    return;
  }
  const url = `https://github.com/login/oauth/authorize?client_id=${config.githubClientId}&redirect_uri=${encodeURIComponent(config.githubRedirectUri)}&scope=repo,user`;
  res.redirect(url);
});

// GET /auth/github/callback — OAuth 回调
router.get("/github/callback", async (req: Request, res: Response) => {
  const { code } = req.query as { code?: string };
  if (!code) {
    res.status(400).json({ message: "缺少授权码" });
    return;
  }
  if (!config.githubClientId || !config.githubClientSecret) {
    res.status(503).json({ message: "GitHub 登录未配置" });
    return;
  }

  try {
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

    const octokit = new Octokit({ auth: tokenData.access_token });
    const { data: ghUser } = await octokit.rest.users.getAuthenticated();
    const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser();
    const primaryEmail = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? `${ghUser.login}@github.com`;

    const user = await findOrCreateOAuthUser(primaryEmail, ghUser.login, ghUser.avatar_url);

    // 更新 GitHub token
    const { db, schema } = await import("@codezone/database");
    const { eq } = await import("drizzle-orm");
    await (db.update(schema.users) as any)
      .set({ githubToken: tokenData.access_token, githubUsername: ghUser.login, avatar: ghUser.avatar_url })
      .where(eq(schema.users.id, user.id));

    const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    const token = signToken(authUser);
    oauthCallbackRedirect(res, token);
  } catch (err) {
    console.error("[auth/github] OAuth callback error:", err);
    res.status(500).json({ message: "GitHub 授权失败" });
  }
});

// ─────────── Google OAuth ───────────

// GET /auth/google — 重定向到 Google 授权页
router.get("/google", (_req: Request, res: Response) => {
  if (!config.googleClientId) {
    res.status(503).json({ message: "Google 登录未配置" });
    return;
  }
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /auth/google/callback — OAuth 回调
router.get("/google/callback", async (req: Request, res: Response) => {
  const { code } = req.query as { code?: string };
  if (!code) {
    res.status(400).json({ message: "缺少授权码" });
    return;
  }
  if (!config.googleClientId || !config.googleClientSecret) {
    res.status(503).json({ message: "Google 登录未配置" });
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: config.googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; id_token?: string; error?: string };
    if (!tokenData.access_token) {
      res.status(400).json({ message: tokenData.error ?? "获取 token 失败" });
      return;
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json() as { email?: string; name?: string; picture?: string; error?: { message: string } };
    if (!googleUser.email) {
      res.status(400).json({ message: googleUser.error?.message ?? "获取 Google 用户信息失败" });
      return;
    }

    const user = await findOrCreateOAuthUser(googleUser.email, googleUser.name ?? googleUser.email.split("@")[0], googleUser.picture ?? null);
    const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    const token = signToken(authUser);
    oauthCallbackRedirect(res, token);
  } catch (err) {
    console.error("[auth/google] OAuth callback error:", err);
    res.status(500).json({ message: "Google 授权失败" });
  }
});

export default router;
