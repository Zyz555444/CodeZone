#!/bin/bash
set -e

echo "=========================================="
echo "CodeZone Docker 构建脚本"
echo "=========================================="

# 启用 BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# 清理旧的构建缓存
echo "清理旧的构建缓存..."
docker system prune -f --volumes 2>/dev/null || true

# 构建镜像
echo "开始构建 Docker 镜像..."
docker compose build --parallel --progress=plain

echo "=========================================="
echo "构建完成！"
echo "=========================================="
echo ""
echo "启动服务:"
echo "  docker compose up -d"
echo ""
echo "查看日志:"
echo "  docker compose logs -f"
echo ""
echo "停止服务:"
echo "  docker compose down"
