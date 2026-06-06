# 阶段1: 构建前端
FROM node:26-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# 阶段2: 构建后端
FROM node:26-alpine AS backend-builder

WORKDIR /app/backend

# 先复制依赖文件安装
COPY backend/package*.json ./
RUN npm install && npm install -D @types/uuid

COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma/
RUN npx prisma generate

COPY backend/src ./src/
RUN npm run build

# 阶段3: 运行
FROM node:26-alpine

WORKDIR /app

# 安装必要的工具
RUN apk add --no-cache openssl netcat-openbsd

# 复制 package.json
COPY package*.json ./

# 复制并安装生产依赖
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

RUN npm install --omit=dev && \
    cd frontend && npm install --omit=dev && \
    cd ../backend && npm install --omit=dev

# 复制构建产物
COPY --from=frontend-builder /app/frontend/.next ./
COPY --from=frontend-builder /app/frontend/public ./
COPY --from=backend-builder /app/backend/dist ./
COPY --from=backend-builder /app/backend/node_modules/.prisma ./
COPY --from=backend-builder /app/backend/node_modules/@prisma ./node_modules/@prisma
COPY --from=backend-builder /app/backend/prisma ./backend/prisma/

# 复制源代码（用于运行时）
COPY backend/src ./backend/src/
COPY frontend/src ./frontend/src/
COPY frontend/next.config.js ./
COPY frontend/next-env.d.ts ./

EXPOSE 3000 4000

ENV NODE_ENV=production

CMD ["sh", "-c", "\
    echo 'Waiting for database...'; \
    until nc -z postgres 5432; do sleep 2; done; \
    cd backend && npx prisma migrate deploy; \
    npm run start"]
