#!/bin/bash

echo "🚀 CodeZone 快速启动脚本"
echo "========================="

# 检查 Node.js 版本
echo "检查 Node.js 版本..."
NODE_VERSION=$(node -v 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ 错误：未检测到 Node.js，请安装 Node.js >= 18.0.0"
    exit 1
fi
echo "✅ Node.js 版本：$NODE_VERSION"

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "创建 .env 文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
fi

# 安装依赖
echo ""
echo "📦 安装项目依赖..."
npm install

# 创建日志目录
mkdir -p backend/logs

# 启动数据库（如果使用 Docker）
echo ""
read -p "是否使用 Docker 启动数据库？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🐳 启动 Docker 容器..."
    docker-compose -f docker-compose.yml up -d
    
    echo "等待数据库启动..."
    sleep 5
fi

# 初始化数据库
echo ""
echo "🗄️ 初始化数据库..."
cd backend
npx prisma migrate dev --name init
npx prisma db seed
cd ..

# 启动开发服务器
echo ""
echo "🎯 启动开发服务器..."
echo "前端：http://localhost:3000"
echo "后端：http://localhost:10101"
echo ""
npm run dev
