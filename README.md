# CodeZone

> 留白也是写作的一部分。

**CodeZone** 是一个面向编程团队的一体化协作开发平台，将代码仓库、议题追踪、合并请求评审、团队讨论、文档知识库与流水线可视化整合在同一个克制、专注的工作空间中。采用 [Yohaku（余白）设计系统](https://github.com/Innei/Yohaku)，以「留白即写作」为核心理念，把注意力还给内容本身。

---

## 特性

- **工作台** — 个人活动概览、待办事项、跨仓库动态流、统计卡片（实时聚合）
- **仓库与代码浏览** — 仓库列表、文件树浏览、语法高亮代码阅读器、提交历史
- **议题管理** — 列表 / 看板双视图、拖拽流转、标签、里程碑、指派、筛选
- **合并请求评审** — Diff 视图、行内评论、检查状态、合并操作与策略选择
- **团队讨论** — 分类话题、置顶、多级评论线程
- **文档库** — Markdown 编辑与实时预览、目录大纲
- **流水线** — CI/CD 运行列表、阶段可视化、日志流、状态追踪
- **团队管理** — 成员名册、角色管理
- **实时协作编辑器** — Monaco + CRDT + Awareness 协议，虚拟协作者演示
- **命令面板** — ⌘K 全局搜索与导航
- **通知中心** — 提及、评审、指派、流水线通知，未读计数与全部已读
- **认证** — JWT + bcrypt，登录 / 注册 / 登出，前端令牌存储与路由守卫
- **深色 / 浅色双主题** — 遵循 Yohaku 契约，浅色纸白 + 浅葱强调，深色暖灰 + 桃强调
- **响应式布局** — 桌面优先，平板与移动端自适应

---

## 技术栈

| 层级 | 技术 |
|------|------|
| Monorepo | Turborepo · pnpm workspaces |
| 前端 | React 19 · TypeScript 7 · Vite 8（Rolldown + Oxc） · Tailwind CSS · React Router · Zustand |
| 后端 | Express 5 · TypeScript 7（ESM） |
| 数据库 | PostgreSQL · Drizzle ORM · drizzle-kit 迁移 |
| 认证 | JWT (jsonwebtoken) · bcryptjs |
| 设计系统 | Yohaku Design System（色彩 / 字体 / 间距 / 动效令牌） |
| 图标 | lucide-react |
| Markdown | react-markdown · remark-gfm |
| 实时协作 | Monaco Editor · CRDT · Awareness 协议 |

---

## 设计系统 · Yohaku

CodeZone 全面落地 Yohaku 设计系统的设计契约：

- **色彩克制** — 一种主色（浅葱 `#33A6B8` / 桃 `#F596AA`），三档十级中性灰，强调色占比 ≤ 5%
- **纸面底色** — 浅色 `#fefefb`（纸张本白），深色 `rgb(28,28,30)`（暖灰夜色）
- **字体有质感** — 标题用衬线（Noto Serif SC），正文用无衬线（Inter + CJK 回退），代码用等宽（JetBrains Mono）
- **字号角色化** — `caption-10` / `label-12` / `copy-13~16` / `title-20~28` / `display-36~48`，CJK 永不 `font-bold`
- **呼吸式动效** — `cubic-bezier(0.22, 1, 0.36, 1)` 缓动，元素随滚动自然浮现而非弹出
- **低调交互** — 悬停时颜色微微加深，如纸面被指尖轻触，无跳跃高亮
- **ring 分层** — 以 `ring-1 ring-border` 承载卡片分层，禁用硬阴影

---

## 快速开始

### 环境要求

- Node.js ≥ 18
- pnpm ≥ 8（推荐）
- PostgreSQL ≥ 14（或使用随附的 Docker Compose）

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 按需修改 .env 中的 DATABASE_URL / JWT_SECRET 等
```

### 3. 启动数据库

```bash
# 使用随附的 Docker Compose 启动 PostgreSQL
docker compose up -d
```

### 4. 初始化数据库

```bash
# 生成迁移文件（首次或 schema 变更后）
pnpm db:generate

# 执行迁移
pnpm db:migrate

# 写入种子数据（幂等，含演示用户与仓库）
pnpm db:seed
```

> 种子用户密码统一为 `codezone123`，可用任意种子邮箱登录。

### 5. 启动开发服务

```bash
pnpm dev
```

Turborepo 会并行启动前后端：

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001/api

### 构建与检查

```bash
pnpm build        # 全量生产构建
pnpm check        # TypeScript 类型检查（全部包）
pnpm lint         # ESLint
```

---

## 项目结构

```
codezone/
├── apps/
│   ├── api/                       # 后端 Express API (@codezone/api)
│   │   ├── src/
│   │   │   ├── routes/            # REST 路由
│   │   │   │   ├── auth.ts        # 注册 / 登录 / 当前用户 / 登出
│   │   │   │   ├── repos.ts       # 仓库 / 文件树 / 提交 / 标签
│   │   │   │   ├── issues.ts      # 议题 CRUD + 评论
│   │   │   │   ├── pulls.ts       # 合并请求 + 行内评论
│   │   │   │   ├── discussions.ts # 讨论
│   │   │   │   ├── pipelines.ts   # 流水线
│   │   │   │   ├── team.ts        # 团队名册
│   │   │   │   ├── dashboard.ts   # 活动流 + 统计聚合
│   │   │   │   ├── milestones.ts  # 里程碑
│   │   │   │   └── notifications.ts # 通知 + 未读计数
│   │   │   ├── auth.ts            # JWT 中间件
│   │   │   ├── config.ts          # 环境变量配置
│   │   │   ├── repository.ts      # Drizzle 仓储层 (全部数据访问)
│   │   │   ├── app.ts             # Express 应用组装
│   │   │   └── server.ts          # 服务入口 + 优雅退出
│   │   └── package.json
│   └── web/                       # 前端 React 应用 (@codezone/web)
│       ├── src/
│       │   ├── components/
│       │   │   ├── layout/        # AppLayout / RepoLayout / Sidebar / TopBar
│       │   │   ├── ui/            # Button / Avatar / Badge / StatusDot / Skeleton
│       │   │   ├── CollaborativeEditor.tsx  # Monaco + CRDT 实时编辑器
│       │   │   └── CommandPalette.tsx       # ⌘K 命令面板
│       │   ├── hooks/useTheme.ts
│       │   ├── lib/
│       │   │   ├── api.ts         # API 客户端 (含 JWT 令牌处理)
│       │   │   ├── crdt.ts        # CRDT 文本合并引擎
│       │   │   ├── awareness.ts   # Awareness 协议
│       │   │   ├── format.ts / utils.ts / types.ts
│       │   │   └── commandIndex.ts
│       │   ├── pages/             # 23 个页面组件
│       │   ├── store/useAppStore.ts  # Zustand 全局状态 (含认证)
│       │   ├── App.tsx            # 路由配置 + 认证守卫
│       │   └── main.tsx
│       └── package.json
├── packages/
│   ├── shared/                    # 前后端共享类型 (@codezone/shared)
│   │   └── src/types.ts
│   └── database/                  # 数据库层 (@codezone/database)
│       ├── src/
│       │   ├── schema.ts          # Drizzle 全量表结构
│       │   ├── client.ts          # 连接池
│       │   ├── seed.ts            # 种子数据
│       │   ├── migrate.ts         # 迁移执行器
│       │   └── index.ts
│       └── drizzle.config.ts
├── turbo.json                     # Turborepo 任务配置
├── pnpm-workspace.yaml
├── docker-compose.yml             # 本地 PostgreSQL
├── .env.example
└── package.json
```

---

## API 概览

所有端点挂载在 `/api` 下，返回统一格式 `{ data, message? }`。需认证的端点要求 `Authorization: Bearer <token>` 头。

### 认证

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册（返回 user + token） | 否 |
| POST | `/api/auth/login` | 登录（返回 user + token） | 否 |
| GET | `/api/auth/me` | 获取当前用户 | 是 |
| POST | `/api/auth/logout` | 登出（无状态，前端丢弃 token） | 否 |

### 业务端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard/activities` | 工作台活动流（含 actor / repo） |
| GET | `/api/dashboard/stats` | 统计概览（实时聚合） |
| GET | `/api/repos` | 仓库列表 |
| GET | `/api/repos/:repoId` | 仓库详情 |
| GET | `/api/repos/:repoId/contents/*splat` | 文件树 / 文件内容 |
| GET | `/api/repos/:repoId/commits` | 提交历史 |
| GET | `/api/repos/:repoId/labels` | 仓库标签 |
| GET | `/api/repos/:repoId/issues` | 议题列表（支持 `?status=`） |
| GET | `/api/repos/:repoId/issues/:issueId` | 议题详情（含评论） |
| POST | `/api/repos/:repoId/issues` | 创建议题 |
| PATCH | `/api/repos/:repoId/issues/:issueId` | 更新议题状态 |
| POST | `/api/repos/:repoId/issues/:issueId/comments` | 添加议题评论 |
| GET | `/api/repos/:repoId/pulls` | 合并请求列表 |
| GET | `/api/repos/:repoId/pulls/:prId` | PR 详情（含 diff 与评论） |
| POST | `/api/repos/:repoId/pulls/:prId/comments` | 添加行内评论 |
| GET | `/api/repos/:repoId/discussions` | 讨论列表 |
| GET | `/api/pipelines/:repoId/pipelines` | 流水线运行列表 |
| GET | `/api/pipelines/run/:runId` | 运行详情（含阶段与日志） |
| GET | `/api/team` | 团队成员名册 |
| GET | `/api/milestones` | 全部里程碑 |
| GET | `/api/milestones/repo/:repoId` | 按仓库列出里程碑 |
| GET | `/api/notifications` | 当前用户通知（支持 `?filter=`） |
| GET | `/api/notifications/unread-count` | 未读数量 |
| POST | `/api/notifications/:id/read` | 标记单条已读 |
| POST | `/api/notifications/read-all` | 标记全部已读 |

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `DATABASE_URL` | PostgreSQL 连接串 | — |
| `JWT_SECRET` | JWT 签名密钥（生产务必替换） | `codezone-dev-secret-change-in-prod` |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `API_PORT` / `PORT` | API 服务端口 | `3001` |
| `CORS_ORIGIN` | 允许的前端来源（逗号分隔） | `http://localhost:5173` |

---

## 路由概览

| 路由 | 页面 |
|------|------|
| `/login` | 登录 / 注册 |
| `/dashboard` | 工作台 |
| `/repos` | 仓库列表 |
| `/repos/:repoId` | 代码浏览 |
| `/repos/:repoId/commits` | 提交历史 |
| `/repos/:repoId/issues` | 议题列表 |
| `/repos/:repoId/issues/board` | 议题看板 |
| `/repos/:repoId/issues/:issueId` | 议题详情 |
| `/repos/:repoId/pulls` | 合并请求列表 |
| `/repos/:repoId/pulls/:prId` | PR 评审 |
| `/repos/:repoId/discussions` | 讨论 |
| `/repos/:repoId/wiki` | 文档库 |
| `/repos/:repoId/pipelines` | 流水线 |
| `/issues` | 全部议题（跨仓库） |
| `/pulls` | 全部合并请求（跨仓库） |
| `/activity` | 活动流 |
| `/milestones` | 里程碑与路线图 |
| `/collaborate` | 实时协作编辑器 |
| `/notifications` | 通知中心 |
| `/profile/:userId` | 个人主页 |
| `/team` | 团队 |
| `/settings` | 设置 |

---

## 致谢

- [Yohaku / 余白](https://github.com/Innei/Yohaku) — 设计系统设计契约与灵感来源（MIT）
- [lucide-react](https://lucide.dev/) — 图标库
- [Inter](https://rsms.me/inter/) · [Noto Serif SC](https://fonts.google.com/noto/specimen/Noto+Serif+SC) · [JetBrains Mono](https://www.jetbrains.com/lp/mono/) — 字体
- [Drizzle ORM](https://orm.drizzle.team/) · [Turborepo](https://turbo.build/) — 基础设施

---

## 许可

MIT
