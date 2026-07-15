/**
 * CodeZone · 认证路由
 * POST /register · POST /login · GET /me · POST /logout
 */
import { Router } from "express";
import type { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import { userRepo } from "../repository.js";
import { signToken, authMiddleware, type AuthUser } from "../auth.js";

const router = Router();

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
  const passwordHash = bcryptjs.hashSync(password, 10);
  const id = `u${Date.now()}`;
  const user = await userRepo.create({ id, name, email, passwordHash });
  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(authUser);
  res.status(201).json({ data: { user, token } });
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
  const valid = bcryptjs.compareSync(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "邮箱或密码错误" });
    return;
  }
  const authUser: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(authUser);
  const { passwordHash: _ph, ...safeUser } = user;
  res.json({ data: { user: safeUser, token } });
});

// 获取当前用户
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  const user = await userRepo.getById(req.user!.id);
  if (!user) {
    res.status(404).json({ message: "用户不存在" });
    return;
  }
  res.json({ data: user });
});

// 登出 (JWT 无状态,前端丢弃 token 即可)
router.post("/logout", (_req: Request, res: Response) => {
  res.json({ data: { success: true } });
});

export default router;
