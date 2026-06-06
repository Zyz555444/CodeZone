FROM node:26-alpine

WORKDIR /app

# 安装必要的工具
RUN apk add --no-cache git openssl netcat-openbsd

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# 安装所有依赖（包括 devDependencies）
RUN npm install && cd backend && npm install

COPY . .

# 构建前端
RUN cd frontend && npm run build

# 构建后端
RUN cd backend && npm run build

# 生成 Prisma 客户端
RUN cd backend && npx prisma generate

EXPOSE 3000 4000

# 生产模式
ENV NODE_ENV=production
ENV NODE_OPTIONS="--openssl-legacy-provider"

# 启动脚本：等待数据库就绪后再启动
CMD ["sh", "-c", "\
    echo 'Waiting for database...'; \
    until nc -z postgres 5432; do sleep 2; done; \
    echo 'Database ready, running migrations...'; \
    cd backend && npx prisma migrate deploy; \
    echo 'Starting application...'; \
    npm run start"]
