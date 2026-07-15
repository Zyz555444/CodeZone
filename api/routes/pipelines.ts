// 流水线路由
import { Router } from "express";
import { store } from "../db/store";

const router = Router();

// 运行列表
router.get("/:repoId/pipelines", (req, res) => {
  res.json({ data: store.listPipelines(req.params.repoId) });
});

// 运行详情
router.get("/run/:runId", (req, res) => {
  const pipeline = store.getPipeline(req.params.runId);
  if (!pipeline) {
    res.status(404).json({ message: "流水线运行不存在" });
    return;
  }
  res.json({ data: pipeline });
});

export default router;
