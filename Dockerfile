# syntax=docker/dockerfile:1

# ============================================
# 阶段1: 依赖安装 (npm + apk 缓存加速)
# ============================================
FROM node:22-alpine AS deps
WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# ============================================
# 阶段2: 前端构建
# ============================================
FROM node:22-alpine AS frontend-builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=768"
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_WS_URL=ws://localhost:10101
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

WORKDIR /app/frontend

# 先复制根 node_modules（包含所有 hoist 的包和 .bin）
COPY --from=deps /app/node_modules ./node_modules
# 再叠加 frontend 专属 node_modules（覆盖 hoist 的版本）
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend/ ./frontend/
COPY frontend/package.json ./

# 利用 Next.js 构建缓存加速
RUN --mount=type=cache,target=/app/frontend/.next/cache \
    npm run build

# ============================================
# 阶段3: 前端生产镜像
# ============================================
FROM node:22-alpine AS frontend
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV PORT=12321
ENV NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_WS_URL=ws://backend:10101

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache curl

COPY --from=frontend-builder --chown=node:node /app/frontend/.next/standalone ./
COPY --from=frontend-builder --chown=node:node /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder --chown=node:node /app/frontend/public ./public
COPY --from=frontend-builder --chown=node:node /app/frontend/next.config.js ./
COPY --from=frontend-builder --chown=node:node /app/frontend/package.json ./

EXPOSE 12321
USER node
CMD ["node", "server.js"]

# ============================================
# 阶段4: 后端构建
# ============================================
FROM node:22-alpine AS backend-builder
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=768"

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/tsconfig.json ./backend/
COPY backend/esbuild.config.js ./backend/
COPY backend/prisma ./backend/prisma/

WORKDIR /app/backend
RUN npx --no-install prisma generate
COPY backend/src ./src/
# 利用 esbuild 缓存加速后端构建
RUN --mount=type=cache,target=/root/.cache/esbuild \
    npm run build
RUN --mount=type=cache,target=/root/.npm \
    cp -r /app/node_modules/.prisma /tmp/.prisma-backup && \
    npm prune --production && \
    mkdir -p node_modules && \
    cp -r /tmp/.prisma-backup node_modules/.prisma

# ============================================
# 阶段5: 后端生产镜像
# ============================================
FROM node:22-alpine AS backend
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache curl openssl netcat-openbsd

COPY --from=backend-builder --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=backend-builder --chown=node:node /app/backend/dist ./dist
COPY --from=backend-builder --chown=node:node /app/backend/prisma ./prisma

COPY docker/start.sh ./start.sh
RUN chmod +x start.sh

EXPOSE 10101
USER node
CMD ["./start.sh"]
