# ============================================
# 阶段1: 依赖安装 (共享缓存层)
# ============================================
FROM node:20-alpine AS deps

# 设置工作目录
WORKDIR /app

# 只安装必要的系统依赖
RUN apk add --no-cache libc6-compat

# 先只复制 package.json 以利用缓存
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# 安装依赖（使用缓存挂载）
RUN --mount=type=cache,target=/root/.npm \
    cd frontend && npm install --legacy-peer-deps && \
    cd ../backend && npm install

# ============================================
# 阶段2: 前端构建
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 限制内存使用
ENV NODE_OPTIONS="--max-old-space-size=768"
ENV NEXT_TELEMETRY_DISABLED=1

# 从 deps 阶段复制已安装的依赖
COPY --from=deps /app/frontend/node_modules ./node_modules

# 复制前端配置和源代码
COPY frontend/package*.json ./
COPY frontend/tsconfig*.json ./
COPY frontend/next*.js ./
COPY frontend/next*.ts ./
COPY frontend/postcss.config.* ./
COPY frontend/tailwind.config.* ./
COPY frontend/src ./src

# 如果有 public 目录则复制（可选）
RUN mkdir -p public
COPY frontend/public ./public 2>/dev/null || true

# 构建前端
RUN --mount=type=cache,target=/app/frontend/.next/cache \
    npm run build

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
RUN apk add --no-cache openssl netcat-openbsd curl

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

# 如果有 public 目录则复制（可选）
RUN mkdir -p public
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/public ./public 2>/dev/null || true

# ============================================
# 后端服务配置
# ============================================
WORKDIR /app/backend

# 复制生产依赖
COPY --from=deps --chown=backend:nodejs /app/backend/node_modules ./node_modules
COPY --from=backend-builder --chown=backend:nodejs /app/backend/dist ./dist
COPY --from=backend-builder --chown=backend:nodejs /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder --chown=backend:nodejs /app/backend/prisma ./prisma

# ============================================
# 启动脚本
# ============================================
WORKDIR /app

# 创建启动脚本
RUN cat > start.sh << 'EOF'
#!/bin/sh
set -e

echo "=========================================="
echo "CodeZone 服务启动脚本"
echo "=========================================="

# 等待数据库就绪
echo "等待 PostgreSQL 就绪..."
until nc -z postgres 5432; do
  sleep 1
done
echo "PostgreSQL 已就绪"

# 等待 Redis 就绪
echo "等待 Redis 就绪..."
until nc -z redis 6379; do
  sleep 1
done
echo "Redis 已就绪"

# 执行数据库迁移
echo "执行 Prisma 数据库同步..."
cd /app/backend
npx prisma db push --skip-generate --accept-data-loss || true

# 启动后端服务
echo "启动后端 API 服务..."
cd /app/backend
node dist/index.js &
BACKEND_PID=$!

# 启动前端服务
echo "启动前端 Next.js 服务..."
cd /app/frontend
node server.js &
FRONTEND_PID=$!

echo "=========================================="
echo "服务已启动:"
echo "  - 前端: http://0.0.0.0:3000"
echo "  - 后端: http://0.0.0.0:4000"
echo "=========================================="

# 等待子进程
wait $BACKEND_PID $FRONTEND_PID
EOF

RUN chmod +x start.sh

# 暴露端口
EXPOSE 3000 4000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# 启动命令
CMD ["./start.sh"]
