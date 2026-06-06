FROM node:18-alpine

WORKDIR /app

# 安装 git（用于 prisma）
RUN apk add --no-cache git

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# 安装所有依赖
RUN npm install

COPY . .

# 构建前端和后端
RUN cd frontend && npm run build
RUN cd backend && npx prisma generate && npx prisma migrate deploy

EXPOSE 3000 4000

CMD ["npm", "run", "dev"]
