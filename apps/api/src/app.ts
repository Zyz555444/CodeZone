/**
 * CodeZone · Express 应用入口
 *
 * 组装中间件、挂载路由、错误处理。
 * 与 server.ts 分离以便测试与扩展。
 */
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { config } from "./config.js";
import { optionalAuth } from "./auth.js";

import authRoutes from "./routes/auth.js";
import repoRoutes from "./routes/repos.js";
import issueRoutes from "./routes/issues.js";
import pullRoutes from "./routes/pulls.js";
import discussionRoutes from "./routes/discussions.js";
import pipelineRoutes from "./routes/pipelines.js";
import teamRoutes from "./routes/team.js";
import githubRoutes from "./routes/github.js";
import gitRoutes from "./routes/git.js";
import gitRoutes from "./routes/git.js";
import gitRoutes from "./routes/git.js";
import dashboardRoutes from "./routes/dashboard.js";
import milestoneRoutes from "./routes/milestones.js";
import notificationRoutes from "./routes/notifications.js";

export function createApp() {
  const app = express();

  // 全局中间件
  app.use(
    cors({
      origin: config.corsOrigin.split(",").map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(optionalAuth);

  // 健康检查
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", env: config.nodeEnv, time: Date.now() });
  });

  // API 路由挂载
  app.use("/api/auth", authRoutes);
  app.use("/api/repos", repoRoutes);
  app.use("/api/repos/:repoId/issues", issueRoutes);
  app.use("/api/repos/:repoId/pulls", pullRoutes);
  app.use("/api/repos/:repoId/discussions", discussionRoutes);
  app.use("/api/repos", pipelineRoutes);
  app.use("/api/team", teamRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/milestones", milestoneRoutes);
  app.use("/api/notifications", notificationRoutes);

  // 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: "资源不存在" });
  });

  // 错误处理
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[CodeZone API] 未捕获错误:", err);
    res.status(500).json({
      message: config.isProd ? "服务器内部错误" : err.message,
    });
  });

  return app;
}
