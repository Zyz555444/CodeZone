// 团队路由
import { Router } from "express";
import { userRepo } from "../repository.js";

const router = Router();

router.get("/", async (_req, res) => {
  const users = await userRepo.list();
  res.json({ data: users });
});

export default router;
