# ============================================
# 阶段1: 依赖安装 (npm + apk 缓存加速)
# ============================================
FROM node:24-alpine AS deps
WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
COPY .npmrc ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --prefer-offline

# ============================================
# 阶段2: 前端构建
# ============================================
FROM node:24-alpine AS frontend-builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1536"
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_WS_URL=/socket.io
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

WORKDIR /app/frontend

# 先复制根 node_modules（包含所有 hoist 的包和 .bin）
COPY --from=deps /app/node_modules ./node_modules
# 再叠加 frontend 专属 node_modules（覆盖 hoist 的版本）
COPY --from=deps /app/frontend/node_modules ./node_modules
# workspace 根 package.json 确保 Next.js 正确检测 monorepo 结构
COPY package.json /app/package.json
COPY frontend/package.json ./package.json
COPY frontend/tsconfig.json ./tsconfig.json
COPY frontend/next.config.js ./next.config.js
COPY frontend/postcss.config.js ./postcss.config.js
COPY frontend/tailwind.config.js ./tailwind.config.js
COPY frontend/middleware.ts ./middleware.ts
COPY frontend/src ./src

# 利用 Next.js 构建缓存加速
# Alpine musl与SWC原生绑定不兼容，回退Webpack
RUN --mount=type=cache,target=/app/frontend/.next/cache \
    npx next build --webpack

# 标准化 standalone 输出：消除 workspace 检测差异
# 无论 Next.js 输出 flat 还是 frontend/ 子目录，统一整理到 standalone/
RUN rm -rf standalone && mkdir -p standalone && \
    cd .next/standalone && \
    if [ -f frontend/server.js ]; then \
        echo "[standalone] workspace mode, extracting frontend/"; \
        cp -a frontend/. /app/frontend/standalone/ && \
        cp -a .next /app/frontend/standalone/ && \
        cp -a node_modules /app/frontend/standalone/; \
    else \
        echo "[standalone] flat mode"; \
        cp -a . /app/frontend/standalone/; \
    fi

# ============================================
# 阶段3: 前端生产镜像
# ============================================
FROM node:24-alpine AS frontend
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV PORT=12321
ENV NEXT_PUBLIC_API_URL=/api

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache curl

COPY --from=frontend-builder --chown=node:node /app/frontend/standalone/ ./

EXPOSE 12321
USER node
CMD ["node", "server.js"]

# ============================================
# 阶段4: 后端构建
# ============================================
FROM node:24-alpine AS backend-builder
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1536"

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache openssl python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/package.json ./backend/
COPY backend/tsconfig.json ./backend/
COPY backend/esbuild.config.js ./backend/
COPY backend/prisma ./backend/prisma/

WORKDIR /app/backend
RUN npx --no-install prisma generate
COPY backend/src ./src/
# 利用 esbuild 缓存加速后端构建
RUN --mount=type=cache,target=/root/.cache/esbuild \
    npm run build

# ============================================
# 阶段5: 后端生产镜像
# ============================================
FROM node:24-alpine AS backend
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache curl openssl netcat-openbsd

# 复制完整 node_modules（先复制根 node_modules 获得所有 hoist 依赖，再叠加 backend 专属）
COPY --from=backend-builder --chown=node:node /app/node_modules ./node_modules
COPY --from=backend-builder --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=backend-builder --chown=node:node /app/backend/dist ./dist
COPY --from=backend-builder --chown=node:node /app/backend/prisma ./prisma

COPY docker/start.sh ./start.sh
RUN chmod +x start.sh && mkdir -p /app/logs && chown node:node /app/logs

EXPOSE 10101
USER node
CMD ["./start.sh"]
