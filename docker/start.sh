#!/bin/sh
set -e

echo "==> 等待 PostgreSQL 就绪..."
until nc -z postgres 5432; do
  echo "   等待 PostgreSQL..."
  sleep 2
done
echo "   PostgreSQL 已就绪"

echo "==> 等待 Redis 就绪..."
until nc -z redis 6379; do
  echo "   等待 Redis..."
  sleep 1
done
echo "   Redis 已就绪"

echo "==> 执行数据库迁移..."
npx prisma migrate deploy --schema=./prisma/schema.prisma 2>/dev/null || {
  echo "   migrate deploy 失败，尝试 db push..."
  npx prisma db push --schema=./prisma/schema.prisma --skip-generate --accept-data-loss 2>/dev/null || echo "   db push 失败，服务端将自动同步 Schema"
}

echo "==> 执行数据迁移（团队创建者角色升级为 OWNER）..."
npx prisma db execute --stdin --schema=./prisma/schema.prisma 2>/dev/null <<'SQL' || echo "   跳过（应用层启动时自动处理）"
UPDATE "TeamMember"
SET "role" = 'OWNER'
FROM "Team"
WHERE "TeamMember"."teamId" = "Team"."id"
  AND "TeamMember"."userId" = "Team"."ownerId"
  AND "TeamMember"."role" = 'ADMIN';
SQL

echo "==> 启动后端服务..."
exec node dist/index.js
