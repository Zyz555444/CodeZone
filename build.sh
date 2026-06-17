#!/bin/bash
set -e

echo "=========================================="
echo "CodeZone Docker 生产构建"
echo "=========================================="

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=plain

echo "开始并行构建 (BuildKit + npm/apk 缓存)..."
docker compose build \
  --parallel \
  --progress=plain

echo ""
echo "构建完成!"
echo ""
echo "启动服务:  docker compose up -d"
echo "查看日志:  docker compose logs -f"
echo "停止服务:  docker compose down"
