# 开发文档

## 项目结构

```
codezone/
├── frontend/          # Next.js 前端应用
│   ├── src/
│   │   ├── app/       # Next.js 14 App Router 页面
│   │   ├── components/# React 组件
│   │   ├── hooks/     # 自定义 Hooks
│   │   ├── lib/       # 工具函数和配置
│   │   ├── stores/    # Zustand 状态管理
│   │   └── types/     # TypeScript 类型定义
│   └── public/        # 静态资源
├── backend/           # Express 后端服务
│   ├── src/
│   │   ├── controllers/ # 控制器
│   │   ├── middleware/  # 中间件
│   │   ├── models/      # 数据模型 (Prisma)
│   │   ├── routes/      # 路由定义
│   │   ├── services/    # 业务逻辑
│   │   ├── utils/       # 工具函数
│   │   └── websocket/   # WebSocket 处理器
│   └── prisma/        # Prisma 配置和迁移
├── docker/            # Docker 配置文件
└── docs/              # 文档
```

## 技术栈详情

### 前端
- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript 5.4+
- **UI 库**: React 18 + TailwindCSS + Radix UI
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **实时通信**: Socket.IO Client
- **协作编辑**: Yjs (待实现)
- **代码编辑器**: Monaco Editor (待集成)

### 后端
- **运行时**: Node.js 18+
- **框架**: Express 4.x
- **语言**: TypeScript 5.4+
- **ORM**: Prisma 5.x
- **数据库**: PostgreSQL 15
- **缓存**: Redis 7
- **认证**: JWT + bcrypt
- **实时通信**: Socket.IO
- **日志**: Winston

## 开发环境配置

### 前置要求
1. Node.js >= 18.0.0
2. PostgreSQL 15+ 或 Docker
3. Redis 7+ 或 Docker

### 安装步骤

1. 克隆项目后安装依赖：
```bash
cd codezone
npm install
```

2. 复制环境变量文件：
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

3. 使用 Docker 启动数据库（推荐）：
```bash
npm run docker:up
```

4. 初始化数据库：
```bash
npm run db:migrate
npm run db:seed
```

5. 启动开发服务器：
```bash
npm run dev
```

访问地址：
- 前端：http://localhost:3000
- 后端：http://localhost:4000
- 健康检查：http://localhost:4000/health

## API 文档

### 认证接口

#### POST /api/auth/register
注册用户

**请求体**:
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

**响应**:
```json
{
  "user": {
    "id": "xxx",
    "email": "user@example.com",
    "username": "username",
    "role": "MEMBER"
  },
  "token": "jwt_token_here"
}
```

#### POST /api/auth/login
用户登录

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**: 同注册接口

#### GET /api/auth/me
获取当前用户信息

**Headers**: `Authorization: Bearer <token>`

### 项目接口

#### GET /api/projects
获取用户的所有项目

**Headers**: `Authorization: Bearer <token>`

#### POST /api/projects
创建新项目

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "name": "项目名称",
  "description": "项目描述",
  "visibility": "private"
}
```

## 数据库设计

主要数据表：
- `User` - 用户
- `Session` - 会话
- `Project` - 项目
- `ProjectMember` - 项目成员
- `Task` - 任务
- `CodeFile` - 代码文件
- `CodeReview` - 代码审查
- `Comment` - 评论
- `Notification` - 通知

详细 schema 请查看 `backend/prisma/schema.prisma`

## WebSocket 事件

### 客户端发送事件

- `join-project` - 加入项目房间
- `leave-project` - 离开项目房间
- `code-change` - 代码变更
- `cursor-move` - 光标移动
- `send-message` - 发送消息

### 服务端广播事件

- `online-users` - 在线用户列表
- `code-change` - 代码变更同步
- `cursor-move` - 光标位置同步
- `receive-message` - 接收消息

## 代码规范

### TypeScript
- 使用严格模式 (`"strict": true`)
- 所有公共 API 必须定义类型
- 使用接口定义复杂对象结构

### 命名规范
- 文件：PascalCase (组件) / camelCase (工具)
- 组件：PascalCase
- 函数/变量：camelCase
- 常量：UPPER_SNAKE_CASE

### Git 提交规范
```
<type>(<scope>): <subject>

# type: feat | fix | docs | style | refactor | test | chore
# scope: 影响范围
# subject: 简短描述
```

示例：
```
feat(project): 添加项目创建功能
fix(auth): 修复登录 token 过期问题
```

## 下一步开发计划

### 第一阶段 (核心功能)
- [x] 用户认证系统
- [x] 项目管理基础
- [x] 任务管理基础
- [ ] 实时协作编辑器 (Monaco + Yjs)
- [ ] 代码文件管理
- [ ] 即时通讯

### 第二阶段 (增强功能)
- [ ] Git 仓库集成
- [ ] 代码审查系统
- [ ] CI/CD 流水线
- [ ] 部署管理

### 第三阶段 (高级功能)
- [ ] 性能监控
- [ ] 代码质量分析
- [ ] 团队统计报表
- [ ] 第三方集成 (GitHub, GitLab 等)

## 常见问题

### 数据库连接失败
确保 PostgreSQL 正在运行，并检查 `.env` 中的 `DATABASE_URL` 配置

### WebSocket 连接失败
检查后端服务是否启动，确认 CORS 配置正确

### Prisma 迁移错误
```bash
npx prisma migrate dev --reset
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License
