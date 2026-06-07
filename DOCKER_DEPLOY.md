# CodeZone Docker 部署指南

## 快速开始

```bash
# 1. 克隆代码
git clone <your-repo>
cd CodeZone

# 2. 构建镜像
chmod +x build.sh
./build.sh

# 3. 启动服务
docker compose up -d

# 4. 查看日志
docker compose logs -f
```

## 优化特性

### 1. 多阶段构建
- **deps 阶段**: 共享依赖安装，利用缓存
- **frontend-builder**: 构建 Next.js 前端
- **backend-builder**: 构建 Node.js 后端
- **runner**: 生产镜像，仅包含必要文件

### 2. 缓存优化
- BuildKit 缓存挂载 (`--mount=type=cache`)
- npm 依赖缓存
- Next.js 构建缓存
- Docker 层缓存

### 3. 资源限制
- 构建内存限制: 768MB
- 运行内存限制: 512MB
- CPU 限制: 2.0 (构建), 1.0 (数据库)
- Redis 内存限制: 256MB

### 4. 健康检查
- 应用服务: HTTP /health 端点
- PostgreSQL: pg_isready 命令
- Redis: redis-cli ping

### 5. 安全优化
- 非 root 用户运行
- Helmet 安全中间件
- CORS 配置
- 最小化镜像体积

## 常用命令

```bash
# 构建并启动
docker compose up -d --build

# 仅构建
docker compose build

# 强制重新构建
docker compose build --no-cache

# 查看日志
docker compose logs -f
docker compose logs -f app
docker compose logs -f postgres

# 进入容器
docker compose exec app sh
docker compose exec postgres psql -U codezone -d codezone

# 重启服务
docker compose restart

# 停止并清理
docker compose down
docker compose down -v  # 同时删除数据卷

# 查看资源使用
docker stats
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| JWT_SECRET | dev-secret-key-change-in-production | JWT 密钥 |
| DATABASE_URL | postgresql://codezone:codezone_password@postgres:5432/codezone | 数据库连接 |
| REDIS_URL | redis://redis:6379 | Redis 连接 |
| NEXT_PUBLIC_API_URL | http://localhost:4000/api | 前端 API 地址 |
| NEXT_PUBLIC_WS_URL | ws://localhost:4000 | WebSocket 地址 |

## 故障排查

### 构建失败

```bash
# 清理缓存后重新构建
docker system prune -f
docker compose build --no-cache
```

### 内存不足

```bash
# 增加 Docker 内存限制
# 在 Docker Desktop 设置中调整

# 或者修改 docker-compose.yml 中的资源限制
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker compose logs postgres

# 进入数据库检查
docker compose exec postgres psql -U codezone -d codezone
```

### 端口冲突

```bash
# 检查端口占用
lsof -i :3000
lsof -i :4000

# 修改 docker-compose.yml 中的端口映射
```

## 性能监控

```bash
# 查看容器资源使用
docker stats

# 查看日志
docker compose logs --tail=100

# 性能分析
docker compose exec app node --prof dist/index.js
```

## 生产部署

1. 修改环境变量
2. 使用 HTTPS
3. 配置反向代理 (Nginx/Traefik)
4. 设置监控告警
5. 定期备份数据
