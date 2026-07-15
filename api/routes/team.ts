// 团队路由
import { Router } from "express";
import { store } from "../db/store";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ data: store.listUsers() });
});

export default router;
