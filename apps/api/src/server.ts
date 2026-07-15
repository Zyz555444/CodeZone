/**
 * CodeZone · 服务启动入口
 *
 * 监听端口、注册优雅退出。
 */
import "dotenv/config";
import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[CodeZone API] 服务已启动 → http://localhost:${config.port} (${config.nodeEnv})`);
});

// 优雅退出
function shutdown(signal: string) {
  console.log(`\n[CodeZone API] 收到 ${signal}, 正在关闭服务...`);
  server.close((err) => {
    if (err) {
      console.error("[CodeZone API] 关闭出错:", err);
      process.exit(1);
    }
    console.log("[CodeZone API] 服务已关闭");
    process.exit(0);
  });
  // 超时强制退出
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("[CodeZone API] 未处理的 Promise 拒绝:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[CodeZone API] 未捕获异常:", err);
  shutdown("uncaughtException");
});

export default server;
