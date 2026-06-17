# ============================================
# 阶段1: 依赖安装 (共享缓存层)
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN npm ci

# ============================================
# 阶段2: 前端构建
# ============================================
FROM node:22-alpine AS frontend-builder

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_WS_URL=ws://localhost:10101

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

ENV NODE_OPTIONS="--max-old-space-size=768"
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY frontend/ ./frontend/

WORKDIR /app/frontend
RUN npm run build

# ============================================
# 阶段3: 前端生产镜像
# ============================================
FROM node:22-alpine AS frontend

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV PORT=12321
ENV NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_WS_URL=ws://backend:10101

RUN apk add --no-cache curl

COPY --from=frontend-builder --chown=node:node /app/frontend/.next/standalone ./
COPY --from=frontend-builder --chown=node:node /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder --chown=node:node /app/frontend/next.config.js ./
COPY --from=frontend-builder --chown=node:node /app/frontend/package.json ./
RUN mkdir -p public

EXPOSE 12321

USER node
CMD ["node", "server.js"]

# ============================================
# 阶段4: 后端构建
# ============================================
FROM node:22-alpine AS backend-builder

WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=768"

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/tsconfig.json ./backend/
COPY backend/prisma ./backend/prisma/
WORKDIR /app/backend
RUN npx prisma generate

COPY backend/src ./src/
RUN npm run build
RUN cp -r node_modules/.prisma /tmp/.prisma-backup
RUN npm prune --production
RUN cp -r /tmp/.prisma-backup node_modules/.prisma

# ============================================
# 阶段5: 后端生产镜像
# ============================================
FROM node:22-alpine AS backend

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

RUN apk add --no-cache curl openssl netcat-openbsd

COPY --from=backend-builder --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=backend-builder --chown=node:node /app/backend/dist ./dist
COPY --from=backend-builder --chown=node:node /app/backend/prisma ./prisma

COPY docker/start.sh ./start.sh
RUN chmod +x start.sh

EXPOSE 10101

USER node
CMD ["./start.sh"]
