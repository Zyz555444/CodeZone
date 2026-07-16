/**
 * CodeZone · JWT 认证中间件
 *
 * - signToken(): 为用户签发 JWT
 * - authMiddleware: 校验 Authorization: Bearer <token>, 注入 req.user
 * - optionalAuth: 可选认证, 有 token 则注入, 无则继续
 * - requireRole: 角色授权中间件, 校验用户是否拥有指定角色
 * - requireTeamRole: 团队角色授权, 校验用户在团队中的角色
 */
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { teamMemberRepo, userRepo } from "./repository.js";
import type { TeamRole, User } from "@codezone/shared";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// 扩展 Express Request 类型
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      teamRole?: TeamRole;
      teamId?: string;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, config.jwtSecret) as AuthUser;
  } catch {
    return null;
  }
}

/** 强制认证 — 无 token 或无效 token 返回 401 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "未登录" });
    return;
  }
  const token = header.slice(7);
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ message: "登录已过期" });
    return;
  }
  req.user = user;
  next();
}

/** 可选认证 — 有 token 则注入, 无则继续 (用于公开接口附带当前用户) */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const user = verifyToken(header.slice(7));
    if (user) req.user = user;
  }
  next();
}

/** 角色授权 — 校验用户是否拥有指定角色 (admin | maintainer | member) */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "未登录" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "权限不足" });
      return;
    }
    next();
  };
}

/** 团队角色授权 — 校验用户在团队中的角色 (owner | admin | member) */
export function requireTeamRole(...roles: TeamRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "未登录" });
      return;
    }
    const teamId = req.params.teamId as string;
    if (!teamId) {
      res.status(400).json({ message: "缺少团队 ID" });
      return;
    }
    const member = await teamMemberRepo.getByTeamAndUser(teamId, req.user.id);
    if (!member) {
      res.status(403).json({ message: "您不是该团队成员" });
      return;
    }
    if (!roles.includes(member.role)) {
      res.status(403).json({ message: "团队权限不足" });
      return;
    }
    req.teamRole = member.role;
    req.teamId = teamId;
    next();
  };
}

// ─────────── OAuth 辅助函数 ───────────

export async function findOrCreateOAuthUser(email: string, name: string, avatar?: string | null): Promise<User> {
  const existing = await userRepo.getByEmail(email);
  if (existing) return existing;
  return await userRepo.create({
    id: `u${Date.now()}`,
    name,
    email,
    passwordHash: null,
    avatar: avatar ?? undefined,
  });
}

export function oauthCallbackRedirect(res: Response, token: string) {
  const frontendUrl = `${config.corsOrigin}/login?token=${token}`;
  res.redirect(frontendUrl);
}
