// 流水线路由
import { Router } from "express";
import type { Request, Response } from "express";
import { pipelineRepo } from "../repository.js";

const router = Router();

// 运行列表
router.get("/:repoId/pipelines", async (req: Request<{ repoId: string }>, res: Response) => {
  const pipelines = await pipelineRepo.list(req.params.repoId);
  res.json({ data: pipelines });
});

// 运行详情
router.get("/run/:runId", async (req: Request<{ runId: string }>, res: Response) => {
  const pipeline = await pipelineRepo.getById(req.params.runId);
  if (!pipeline) {
    res.status(404).json({ message: "流水线运行不存在" });
    return;
  }
  res.json({ data: pipeline });
});

export default router;
