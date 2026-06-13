#!/bin/sh
set -e

echo "等待 PostgreSQL..."
until nc -z postgres 5432; do sleep 1; done

echo "等待 Redis..."
until nc -z redis 6379; do sleep 1; done

echo "执行 Prisma 同步..."
npx prisma db push --skip-generate --accept-data-loss || true

echo "启动后端服务..."
exec node dist/index.js
