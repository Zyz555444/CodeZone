/**
 * CodeZone · 数据库迁移执行器
 *
 * 执行 ./drizzle 目录下由 drizzle-kit generate 产出的迁移文件。
 *
 * 运行: pnpm db:migrate  (tsx src/migrate.ts)
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("[migrate] 缺少环境变量 DATABASE_URL");
}

// 迁移只需单连接
const sql = postgres(databaseUrl, { max: 1, prepare: false });
const db = drizzle(sql);

(async () => {
  try {
    console.log("CodeZone · 开始执行数据库迁移...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✓ 迁移完成");
  } catch (err) {
    console.error("✗ 迁移失败:", err);
    await sql.end();
    process.exit(1);
  }
  await sql.end();
  process.exit(0);
})();
