# CodeZone

面向编程团队的协作开发平台，支持项目管理、任务看板、在线代码编辑、实时多人协作和代码审查。

## 功能特性

### 用户与团队
- 用户注册/登录，JWT 认证
- 团队创建与成员管理
- 角色权限控制

### 项目管理
- 项目 CRUD，公开/私有两种可见性
- 项目成员邀请与管理
- 项目统计面板

### 任务系统
- 看板视图 (TODO / In Progress / In Review / Done / Blocked)
- 优先级与截止日期
- 子任务拆分
- 任务评论与负责人分配

### 代码协作
- Monaco Editor，语法高亮与智能提示
- 多人实时协作编辑 (Yjs + WebSocket)
- 远程光标与在线用户指示器
- 文件树浏览与管理

### 代码审查
- 创建与跟踪审查请求
- 审查状态管理
- 审查评论

### 即时通讯
- 项目内实时聊天 (Socket.IO)
- AI 助手集成

### 其他
- 明暗主题切换
- 通知系统
- 活动日志
- 全局搜索

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16 (App Router), React 19 |
| 语言 | TypeScript 5.x |
| 样式 | TailwindCSS 4, Radix UI |
| 状态管理 | Zustand |
| 编辑器 | Monaco Editor + Yjs |
| 后端框架 | Express 4.x |
| ORM | Prisma 5 |
| 数据库 | PostgreSQL 17 |
| 缓存 | Redis 7 |
| 实时通信 | Socket.IO, Y-WebSocket |
| 认证 | JWT + bcrypt |
| 日志 | Winston |
| 容器化 | Docker + Docker Compose |
| 构建 | esbuild |

## 项目结构

```
codezone/
├── frontend/                # Next.js 前端
│   └── src/
│       ├── app/             # 页面路由
│       ├── components/      # UI 组件
│       ├── stores/          # Zustand 状态
│       ├── hooks/           # 自定义 Hooks
│       └── lib/             # 工具与 API 客户端
├── backend/                 # Express 后端
│   └── src/
│       ├── controllers/     # 控制器
│       ├── routes/          # 路由 (16 个模块)
│       ├── middleware/       # 中间件
│       ├── websocket/       # WebSocket 处理
│       ├── collaboration/   # Yjs 协作服务
│       ├── lib/             # 库配置 (Prisma, Redis)
│       └── utils/           # 工具函数
├── docker/                  # Docker 相关配置
├── docs/                    # 项目文档
├── scripts/                 # 脚本工具
├── docker-compose.yml       # 服务编排
├── Dockerfile               # 多阶段构建
└── package.json             # npm workspaces 配置
```

## 数据库

共 14 张核心数据表：

`User`, `Session`, `Project`, `ProjectMember`, `Repository`, `Commit`, `Task`, `SubTask`, `CodeFile`, `Comment`, `CodeReview`, `ReviewComment`, `Notification`, `Activity`

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose (用于运行数据库)
- PostgreSQL 17 (手动的) 或通过 Docker 自动启动

### 开发环境

```bash
# 1. 克隆项目
git clone <repository-url>
cd codezone

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入数据库密码和 JWT 密钥

# 4. 启动基础设施（PostgreSQL + Redis）
npm run docker:up

# 5. 初始化数据库
npm run db:migrate
npm run db:seed

# 6. 启动开发服务器
npm run dev
```

启动后访问：
- **前端**: http://localhost:12321
- **后端 API**: http://localhost:10101

### 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端开发服务器 |
| `npm run dev:frontend` | 仅启动前端 |
| `npm run dev:backend` | 仅启动后端 |
| `npm run build` | 构建前后端 |
| `npm run test` | 运行测试 |
| `npm run lint` | 代码检查 |
| `npm run db:migrate` | 数据库迁移 |
| `npm run db:seed` | 填充种子数据 |
| `npm run docker:up` | 启动 Docker 服务 |
| `npm run docker:down` | 停止 Docker 服务 |

## 部署

使用 Docker Compose 一键部署：

```bash
chmod +x build.sh
./build.sh
docker compose up -d
```

详细部署说明请参阅 [Docker 部署指南](./DOCKER_DEPLOY.md) 和 [部署手册](./docs/deployment.md)。

## 文档

- [开发指南](./docs/development.md)
- [部署手册](./docs/deployment.md)
- [API 文档](./docs/API.md)
- [帮助中心](./docs/HELP.md)
- [更新日志](./CHANGELOG.md)

## 许可证

MIT License
