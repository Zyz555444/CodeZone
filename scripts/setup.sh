#!/bin/bash

echo "======================================"
echo "   CodeZone 开发环境快速启动脚本"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js
echo "📌 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误：未检测到 Node.js${NC}"
    echo "请安装 Node.js >= 18.0.0"
    echo "https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js: ${NODE_VERSION}${NC}"

# 检查 npm
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm: ${NPM_VERSION}${NC}"
echo ""

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cp .env.example .env
    echo -e "${GREEN}✅ 已创建 .env 文件${NC}"
    echo -e "${YELLOW}⚠️  请编辑 .env 文件配置数据库连接信息${NC}"
    echo ""
    read -p "是否现在编辑 .env 文件？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        nano .env
    fi
    echo ""
fi

# 检查 Docker
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "🐳 检测到 Docker，是否使用 Docker 启动数据库？"
    read -p "(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 启动 Docker 容器..."
        docker-compose -f docker/docker-compose.yml up -d
        
        echo "⏳ 等待数据库启动..."
        sleep 10
        
        echo -e "${GREEN}✅ 数据库容器已启动${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未检测到 Docker，请确保 PostgreSQL 和 Redis 已安装并运行${NC}"
fi

# 检查是否已有 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
fi

# 创建日志目录
mkdir -p backend/logs

# 初始化数据库
echo ""
echo "🗄️  初始化数据库..."
cd backend

if [ ! -d "node_modules/.prisma" ]; then
    echo "生成 Prisma Client..."
    npx prisma generate
fi

read -p "是否运行数据库迁移？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "运行迁移..."
    npx prisma migrate dev --name init
    
    echo "初始化测试数据..."
    npx prisma db seed
fi

cd ..

echo ""
echo "======================================"
echo "   🎉 准备启动开发服务器"
echo "======================================"
echo ""
echo "📍 前端地址：http://localhost:3000"
echo "📍 后端地址：http://localhost:4000"
echo ""
echo "📋 可用命令:"
echo "  npm run dev        # 启动前后端开发服务器"
echo "  npm run dev:frontend  # 仅启动前端"
echo "  npm run dev:backend   # 仅启动后端"
echo "  npm run docker:up     # 启动 Docker 容器"
echo "  npm run docker:down   # 停止 Docker 容器"
echo ""

read -p "是否现在启动开发服务器？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 启动开发服务器..."
    npm run dev
else
    echo -e "${GREEN}✅ 配置完成！手动运行 npm run dev 启动服务${NC}"
fi
