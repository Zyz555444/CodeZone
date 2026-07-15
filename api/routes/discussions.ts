// 讨论路由
import { Router } from "express";
import { store } from "../db/store";

const router = Router({ mergeParams: true });

router.get("/", (req, res) => {
  res.json({ data: store.listDiscussions(req.params.repoId) });
});

export default router;
