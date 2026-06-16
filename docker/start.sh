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
  npx prisma db push --schema=./prisma/schema.prisma --skip-generate --accept-data-loss
}

echo "==> 启动后端服务..."
exec node dist/index.js
