# ============================================
# 阶段1: 依赖安装 (共享缓存层)
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

RUN cd frontend && npm install --legacy-peer-deps && \
    cd ../backend && npm install

# ============================================
# 阶段2: 前端构建
# ============================================
FROM node:20-alpine AS frontend-builder

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_WS_URL=ws://localhost:10101

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

WORKDIR /app/frontend

RUN npm install -g pnpm

ENV NODE_OPTIONS="--max-old-space-size=768"
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend/ ./

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================
# 阶段3: 前端生产镜像
# ============================================
FROM node:20-alpine AS frontend

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV PORT=12321
ENV NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_WS_URL=ws://backend:10101

RUN apk add --no-cache curl

COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/next.config.js ./
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/package.json ./
RUN mkdir -p public

EXPOSE 12321

CMD ["node", "server.js"]

# ============================================
# 阶段4: 后端构建
# ============================================
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

ENV NODE_OPTIONS="--max-old-space-size=768"

RUN apk add --no-cache openssl

COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma/
RUN npx prisma generate

COPY backend/src ./src/
RUN npm run build
RUN npm prune --production

# ============================================
# 阶段5: 后端生产镜像
# ============================================
FROM node:20-alpine AS backend

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

RUN apk add --no-cache curl openssl

COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/node_modules ./node_modules
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/dist ./dist
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/prisma ./prisma

# 等待数据库就绪并启动
COPY docker/start.sh ./start.sh
RUN chmod +x start.sh

EXPOSE 10101

CMD ["./start.sh"]
