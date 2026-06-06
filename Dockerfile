FROM node:22-alpine

WORKDIR /app

# 安装 git（用于 prisma）
RUN apk add --no-cache git

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# 安装所有依赖
RUN npm install

COPY . .

# 构建前端
RUN cd frontend && npm run build

# 生成 Prisma 客户端
RUN cd backend && npx prisma generate

EXPOSE 3000 4000

# 生产模式
ENV NODE_ENV=production

CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && npm run start"]
