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

# 不需要构建，直接运行开发模式

EXPOSE 3000 4000

CMD ["npm", "run", "dev"]
