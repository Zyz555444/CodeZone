# ============================================
# 阶段1: 依赖安装 (共享缓存层)
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# 只安装必要的系统依赖
RUN apk add --no-cache libc6-compat

# 先只复制 package.json 以利用缓存
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# 安装依赖
RUN cd frontend && npm install --legacy-peer-deps && \
    cd ../backend && npm install

# ============================================
# 阶段2: 前端构建
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 安装 pnpm（Next.js 16 需要 pnpm 下载 SWC 包）
RUN npm install -g pnpm

# 限制内存使用
ENV NODE_OPTIONS="--max-old-space-size=768"
ENV NEXT_TELEMETRY_DISABLED=1

# 从 deps 阶段复制已安装的依赖
COPY --from=deps /app/frontend/node_modules ./node_modules

# 复制前端源代码和配置
COPY frontend/ ./

# 构建前端（禁用类型检查）
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=768"
RUN npm run build

# ============================================
# 阶段3: 后端构建
# ============================================
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# 限制内存使用
ENV NODE_OPTIONS="--max-old-space-size=768"

# 安装编译依赖
RUN apk add --no-cache openssl

# 从 deps 阶段复制已安装的依赖
COPY --from=deps /app/backend/node_modules ./node_modules

# 复制后端配置
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# 复制 Prisma 配置并生成客户端
COPY backend/prisma ./prisma/
RUN npx prisma generate

# 复制后端源代码
COPY backend/src ./src/

# 构建后端
RUN npm run build

# 清理开发依赖
RUN npm prune --production

# ============================================
# 阶段4: 生产镜像
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=512"

# 安装必要的系统工具
RUN apk add --no-cache openssl netcat-openbsd curl lsof

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    adduser --system --uid 1002 backend

# ============================================
# 前端服务配置
# ============================================
WORKDIR /app/frontend

# 从构建阶段复制前端产物（standalone 模式）
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static

# 复制 public 目录（如果不存在则创建空目录）
RUN mkdir -p public

# ============================================
# 后端服务配置
# ============================================
WORKDIR /app/backend

# 复制生产依赖和构建产物
COPY --from=backend-builder --chown=backend:nodejs /app/backend/node_modules ./node_modules
COPY --from=backend-builder --chown=backend:nodejs /app/backend/dist ./dist
COPY --from=backend-builder --chown=backend:nodejs /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder --chown=backend:nodejs /app/backend/prisma ./prisma

# ============================================
# 启动脚本
# ============================================
WORKDIR /app

# 创建后端启动脚本
RUN cat > start-backend.sh << 'EOF'
#!/bin/sh
set -e

echo "=========================================="
echo "等待数据库就绪..."
echo "=========================================="

until nc -z postgres 5432; do
  sleep 1
done
echo "PostgreSQL 已就绪"

until nc -z redis 6379; do
  sleep 1
done
echo "Redis 已就绪"

echo "执行 Prisma 数据库同步..."
npx prisma db push --skip-generate --accept-data-loss || true

echo "=========================================="
echo "启动后端 API 服务..."
echo "=========================================="

exec node dist/index.js
EOF

# 创建前端启动脚本
RUN cat > start-frontend.sh << 'EOF'
#!/bin/sh
set -e

echo "=========================================="
echo "启动前端 Next.js 服务..."
echo "=========================================="

# 等待后端启动
until nc -z localhost 10101; do
  echo "等待后端就绪..."
  sleep 1
done

echo "后端已就绪，启动前端..."
exec node server.js
EOF

# 创建主启动脚本
RUN cat > start.sh << 'EOF'
#!/bin/sh
set -e

echo "=========================================="
echo "CodeZone 服务启动脚本"
echo "=========================================="

# 清理占用端口的进程
echo "清理端口..."
for port in 10101 12321; do
  lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
done
sleep 2

# 等待数据库
until nc -z postgres 5432; do
  echo "等待 PostgreSQL..."
  sleep 1
done

until nc -z redis 6379; do
  echo "等待 Redis..."
  sleep 1
done

echo "数据库已就绪"

# 执行 Prisma 同步
cd /app/backend
npx prisma db push --skip-generate --accept-data-loss || true

echo "启动后端..."
node dist/index.js &
BACKEND_PID=$!
sleep 3

echo "启动前端..."
cd /app/frontend
node server.js &

echo "=========================================="
echo "服务已启动:"
echo "  - 前端: http://0.0.0.0:12321"
echo "  - 后端: http://0.0.0.0:10101"
echo "=========================================="

# 保持脚本运行
tail -f /dev/null
EOF

RUN chmod +x start.sh

# 暴露端口
EXPOSE 12321 10101

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:10101/health || exit 1

# 启动命令
CMD ["./start.sh"]
