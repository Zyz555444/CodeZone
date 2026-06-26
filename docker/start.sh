#!/bin/sh
set -e

echo "==> 等待 PostgreSQL 就绪..."
MAX_WAIT=60
waited=0
until nc -z postgres 5432; do
  waited=$((waited + 2))
  if [ "$waited" -ge "$MAX_WAIT" ]; then
    echo "   PostgreSQL 等待超时(${MAX_WAIT}s)，继续启动（应用层将重试连接）..."
    break
  fi
  echo "   等待 PostgreSQL... (${waited}s)"
  sleep 2
done
echo "   PostgreSQL 已就绪"

echo "==> 等待 Redis 就绪..."
waited=0
until nc -z redis 6379; do
  waited=$((waited + 2))
  if [ "$waited" -ge "$MAX_WAIT" ]; then
    echo "   Redis 等待超时(${MAX_WAIT}s)，继续启动（应用层将重试连接）..."
    break
  fi
  echo "   等待 Redis... (${waited}s)"
  sleep 2
done
echo "   Redis 已就绪"

echo "==> 执行数据库迁移..."
node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma 2>/dev/null || {
  echo "   migrate deploy 失败，尝试 db push..."
  node_modules/.bin/prisma db push --schema=./prisma/schema.prisma --skip-generate 2>/dev/null || echo "   db push 失败，服务端将自动同步 Schema"
}

echo "==> 执行数据迁移（团队创建者角色升级为 OWNER）..."
node_modules/.bin/prisma db execute --stdin --schema=./prisma/schema.prisma 2>/dev/null <<'SQL' || echo "   跳过（应用层启动时自动处理）"
UPDATE "TeamMember"
SET "role" = 'OWNER'
FROM "Team"
WHERE "TeamMember"."teamId" = "Team"."id"
  AND "TeamMember"."userId" = "Team"."ownerId"
  AND "TeamMember"."role" = 'ADMIN';
SQL

echo "==> 创建日志目录..."
mkdir -p /app/logs

echo "==> 启动后端服务..."
exec node dist/index.js
