/**
 * CodeZone · 数据库连接池
 *
 * 使用 postgres.js 驱动 + Drizzle ORM。
 * 连接串来自环境变量 DATABASE_URL。
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("[database] 缺少环境变量 DATABASE_URL");
}

// 连接池配置: 生产级参数
const queryClient = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // 生产环境关闭 prepare 以兼容部分 PaaS (如 Supabase pooler)
  prepare: false,
  onnotice: () => {}, // 忽略 NOTICE
});

export const db = drizzle(queryClient, { schema, logger: process.env.NODE_ENV === "development" });

export { schema };
export type Database = typeof db;
