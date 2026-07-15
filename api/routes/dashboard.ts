// 工作台路由
import { Router } from "express";
import { store } from "../db/store";

const router = Router();

router.get("/activities", (req, res) => {
  const limit = parseInt((req.query.limit as string) || "15", 10);
  const activities = store.listActivities(limit);
  // 附带 actor 与 repo 信息
  const enriched = activities.map((a) => ({
    ...a,
    actor: store.getUser(a.actorId),
    repo: store.getRepo(a.repoId),
  }));
  res.json({ data: enriched });
});

router.get("/stats", (_req, res) => {
  res.json({ data: store.getStats() });
});

export default router;
