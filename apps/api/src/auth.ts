/**
 * CodeZone · JWT 认证中间件
 *
 * - signToken(): 为用户签发 JWT
 * - authMiddleware: 校验 Authorization: Bearer <token>, 注入 req.user
 * - optionalAuth: 可选认证, 有 token 则注入, 无则继续
 */
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

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
