// 流水线路由
import { Router } from "express";
import type { Request, Response } from "express";
import { pipelineRepo, repoRepo } from "../repository.js";

const router = Router();

// 运行列表
router.get("/:repoId/pipelines", async (req: Request<{ repoId: string }>, res: Response) => {
  const pipelines = await pipelineRepo.list(req.params.repoId);
  res.json({ data: pipelines });
});

// 触发运行 — 在指定仓库上手动触发一次流水线
router.post("/:repoId/pipelines", async (req: Request<{ repoId: string }>, res: Response) => {
  const repo = await repoRepo.getById(req.params.repoId);
  if (!repo) {
    res.status(404).json({ message: "仓库不存在" });
    return;
  }
  const { branch } = req.body as { branch?: string };
  const pipeline = await pipelineRepo.create({
    repoId: repo.id,
    commitSha: "manual-trigger",
    commitMessage: "手动触发",
    status: "pending",
    trigger: "manual",
    authorId: req.user!.id,
    branch: branch ?? repo.defaultBranch,
    stages: [
      { id: "s1", name: "构建", status: "pending", durationMs: 0, log: "" },
      { id: "s2", name: "测试", status: "pending", durationMs: 0, log: "" },
      { id: "s3", name: "部署", status: "pending", durationMs: 0, log: "" },
    ],
  });
  res.status(201).json({ data: pipeline });
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

// 重试运行 — 将失败/已结束的运行重置为 pending
router.post("/run/:runId/retry", async (req: Request<{ runId: string }>, res: Response) => {
  const pipeline = await pipelineRepo.getById(req.params.runId);
  if (!pipeline) {
    res.status(404).json({ message: "流水线运行不存在" });
    return;
  }
  if (pipeline.status === "running") {
    res.status(409).json({ message: "运行中,无法重试" });
    return;
  }
  const updated = await pipelineRepo.updateStatus(req.params.runId, "pending");
  res.json({ data: updated });
});

// 取消运行 — 将运行标记为失败
router.post("/run/:runId/cancel", async (req: Request<{ runId: string }>, res: Response) => {
  const pipeline = await pipelineRepo.getById(req.params.runId);
  if (!pipeline) {
    res.status(404).json({ message: "流水线运行不存在" });
    return;
  }
  if (pipeline.status !== "running" && pipeline.status !== "pending") {
    res.status(409).json({ message: "当前状态不可取消" });
    return;
  }
  const updated = await pipelineRepo.updateStatus(req.params.runId, "failed");
  res.json({ data: updated });
});

export default router;
