# CodeZone 部署指南

本文档介绍如何将 CodeZone 部署到生产环境。

## 部署前准备

### 系统要求
- Linux 服务器 (Ubuntu 20.04+ 推荐)
- 2GB+ RAM
- 20GB+ 磁盘空间
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Nginx
- PM2

### 域名和 SSL
- 已配置的域名
- SSL 证书 (推荐使用 Let's Encrypt)

## 快速部署

### 1. 克隆项目
```bash
git clone <repository-url> /var/www/codezone
cd /var/www/codezone
```

### 2. 安装依赖
```bash
npm install --production
```

### 3. 配置环境变量
```bash
cp .env.example .env
nano .env
```

必要配置：
```ini
NODE_ENV=production
DATABASE_URL="postgresql://user:password@localhost:5432/codezone"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-key"
FRONTEND_URL="https://your-domain.com"
PORT=4000
```

### 4. 设置数据库
```bash
# 安装 PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE codezone;
CREATE USER codezone_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE codezone TO codezone_user;
\q

# 运行迁移
cd backend
npx prisma migrate deploy
npx prisma db seed
```

### 5. 设置 Redis
```bash
sudo apt-get install redis-server
sudo systemctl enable redis
sudo systemctl start redis
```

### 6. 构建前端
```bash
cd frontend
npm run build
```

### 7. 配置 PM2
创建 PM2 配置文件 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'codezone-backend',
      cwd: './backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      instances: 'max',
      exec_mode: 'cluster',
    },
    {
      name: 'codezone-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

启动应用：
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 8. 配置 Nginx

创建配置文件 `/etc/nginx/sites-available/codezone`：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location '/.well-known/acme-challenge' {
        root /var/www/certbot;
    }
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 后端 API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/codezone /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. 安装 SSL 证书
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 10. 验证部署
```bash
# 检查服务状态
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis

# 查看日志
pm2 logs
sudo tail -f /var/log/nginx/error.log
```

## Docker 部署

使用 Docker Compose 快速部署：

1. 确保已安装 Docker 和 Docker Compose

2. 创建 `docker-compose.prod.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: codezone
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: codezone
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - codezone

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - codezone

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      DATABASE_URL: postgresql://codezone:${DB_PASSWORD}@postgres:5432/codezone
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on:
      - postgres
      - redis
    networks:
      - codezone

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    environment:
      NEXT_PUBLIC_API_URL: /api
      NEXT_PUBLIC_WS_URL: 
    depends_on:
      - backend
    networks:
      - codezone

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - codezone

volumes:
  postgres_data:
  redis_data:

networks:
  codezone:
    driver: bridge
```

3. 启动服务：
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 监控和维护

### 日志查看
```bash
# 应用日志
pm2 logs codezone-backend --lines 100
pm2 logs codezone-frontend --lines 100

# 系统日志
sudo journalctl -u nginx -f
sudo tail -f /var/log/postgresql/postgresql.log
```

### 数据库备份
```bash
# 创建备份
pg_dump -U codezone_user codezone > backup_$(date +%Y%m%d).sql

# 恢复备份
psql -U codezone_user codezone < backup_20240101.sql
```

### 更新部署
```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
npm install --production

# 运行数据库迁移
cd backend && npx prisma migrate deploy

# 构建前端
cd ../frontend && npm run build

# 重启服务
pm2 restart all
```

## 故障排查

### 常见问题

1. **数据库连接失败**
   - 检查 PostgreSQL 服务状态
   - 验证 DATABASE_URL 配置
   - 检查防火墙设置

2. **WebSocket 连接失败**
   - 确认 Nginx WebSocket 配置正确
   - 检查 CORS 设置
   - 验证防火墙端口

3. **前端页面无法访问**
   - 检查 Nginx 配置
   - 验证 SSL 证书
   - 查看浏览器控制台错误

## 性能优化

### 数据库优化
```sql
-- 添加索引
CREATE INDEX CONCURRENTLY idx_tasks_status ON "Task"(status);
CREATE INDEX CONCURRENTLY idx_projects_owner ON "Project"(ownerId);

-- 定期维护
VACUUM ANALYZE;
```

### Redis 缓存
```javascript
// 在关键位置添加 Redis 缓存
const cached = await redis.get(key);
if (cached) return JSON.parse(cached);

const result = await expensiveOperation();
await redis.setex(key, 300, JSON.stringify(result));
return result;
```

### CDN 配置
将静态资源（图片、CSS、JS）移至 CDN 以加速访问。

## 安全建议

1. 定期更新系统补丁
2. 配置防火墙 (UFW)
3. 启用_fail2ban_防止暴力破解
4. 定期备份数据库
5. 监控日志发现异常
6. 使用强密码策略
7. 启用 HTTPS 强制跳转
8. 配置 Content Security Policy

## 联系支持

如遇到部署问题，请查看：
- 项目文档：`/docs`
- GitHub Issues
- 技术支持邮箱
