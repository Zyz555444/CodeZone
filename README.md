# CodeZone

> 留白也是写作的一部分。

**CodeZone** 是一个面向编程团队的一体化协作开发平台，将代码仓库、议题追踪、合并请求评审、团队讨论、文档知识库与流水线可视化整合在同一个克制、专注的工作空间中。采用 [Yohaku（余白）设计系统](https://github.com/Innei/Yohaku)，以「留白即写作」为核心理念，把注意力还给内容本身。

---

## 特性

- **工作台** — 个人活动概览、待办事项、跨仓库动态流、统计卡片
- **仓库与代码浏览** — 仓库列表、文件树浏览、语法高亮代码阅读器、提交历史
- **议题管理** — 列表 / 看板双视图、拖拽流转、标签、里程碑、指派、筛选
- **合并请求评审** — Diff 视图、行内评论、检查状态、合并操作与策略选择
- **团队讨论** — 分类话题、置顶、多级评论线程
- **文档库** — Markdown 编辑与实时预览、目录大纲
- **流水线** — CI/CD 运行列表、阶段可视化、日志流、状态追踪
- **团队管理** — 成员名册、角色管理
- **设置** — 个人资料、外观主题、通知偏好、安全管理
- **深色 / 浅色双主题** — 遵循 Yohaku 契约，浅色纸白 + 浅葱强调，深色暖灰 + 桃强调
- **响应式布局** — 桌面优先，平板与移动端自适应

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 · TypeScript · Vite · Tailwind CSS · React Router · Zustand |
| 后端 | Express 4 · TypeScript（ESM） |
| 数据 | 内存数据存储（演示用完整种子数据） |
| 设计系统 | Yohaku Design System（色彩 / 字体 / 间距 / 动效令牌） |
| 图标 | lucide-react |
| Markdown | react-markdown · remark-gfm |

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

### 安装与运行

```bash
# 安装依赖
pnpm install

# 同时启动前端与后端开发服务器
pnpm dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001/api

### 单独运行

```bash
pnpm client:dev   # 仅前端
pnpm server:dev   # 仅后端（nodemon 热重载）
```

### 构建与检查

```bash
pnpm build        # 类型检查 + 生产构建
pnpm check        # TypeScript 类型检查
pnpm lint         # ESLint
```

---

## 项目结构

```
codezone/
├── api/                    # 后端 Express API
│   ├── db/
│   │   ├── seed.ts         # 演示种子数据
│   │   └── store.ts        # 仓储层 (CRUD)
│   ├── routes/             # REST 路由
│   │   ├── dashboard.ts
│   │   ├── discussions.ts
│   │   ├── issues.ts
│   │   ├── pipelines.ts
│   │   ├── pulls.ts
│   │   ├── repos.ts
│   │   └── team.ts
│   ├── app.ts              # Express 应用
│   └── server.ts           # 本地服务入口
├── shared/
│   └── types.ts            # 前后端共享类型
├── src/                    # 前端 React 应用
│   ├── components/
│   │   ├── layout/         # 全局布局 (Sidebar, TopBar, AppLayout, RepoLayout)
│   │   └── ui/             # 基础 UI 组件 (Button, Avatar, Badge, StatusDot, Skeleton)
│   ├── hooks/
│   │   └── useTheme.ts     # 主题切换
│   ├── lib/
│   │   ├── api.ts          # API 客户端
│   │   ├── format.ts       # 格式化工具
│   │   ├── types.ts        # 类型重导出
│   │   └── utils.ts        # cn 工具
│   ├── pages/              # 页面组件
│   │   ├── Dashboard.tsx
│   │   ├── ReposList.tsx
│   │   ├── CodeBrowser.tsx
│   │   ├── Commits.tsx
│   │   ├── IssuesList.tsx
│   │   ├── IssueBoard.tsx
│   │   ├── IssueDetail.tsx
│   │   ├── PullsList.tsx
│   │   ├── PullDetail.tsx
│   │   ├── Discussions.tsx
│   │   ├── Wiki.tsx
│   │   ├── PipelinesList.tsx
│   │   ├── PipelineDetail.tsx
│   │   ├── Team.tsx
│   │   ├── Settings.tsx
│   │   ├── GlobalIssues.tsx
│   │   └── GlobalPulls.tsx
│   ├── store/
│   │   └── useAppStore.ts  # Zustand 全局状态
│   ├── App.tsx             # 路由配置
│   ├── main.tsx            # 入口
│   └── index.css           # Yohaku 全局样式与令牌
├── index.html
├── tailwind.config.js      # Yohaku 令牌 Tailwind 配置
├── vite.config.ts
└── package.json
```

---

## API 概览

所有端点挂载在 `/api` 下，返回统一格式 `{ data, message? }`。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard/activities` | 工作台活动流 |
| GET | `/api/dashboard/stats` | 统计概览 |
| GET | `/api/repos` | 仓库列表 |
| GET | `/api/repos/:repoId` | 仓库详情 |
| GET | `/api/repos/:repoId/contents/*` | 文件树 / 文件内容 |
| GET | `/api/repos/:repoId/commits` | 提交历史 |
| GET | `/api/repos/:repoId/issues` | 议题列表（支持 `?status=` 筛选） |
| GET | `/api/repos/:repoId/issues/:issueId` | 议题详情（含评论） |
| PATCH | `/api/repos/:repoId/issues/:issueId` | 更新议题状态 |
| GET | `/api/repos/:repoId/pulls` | 合并请求列表 |
| GET | `/api/repos/:repoId/pulls/:prId` | PR 详情（含 diff 与评论） |
| POST | `/api/repos/:repoId/pulls/:prId/comments` | 添加行内评论 |
| GET | `/api/repos/:repoId/discussions` | 讨论列表 |
| GET | `/api/pipelines/:repoId/pipelines` | 流水线运行列表 |
| GET | `/api/pipelines/run/:runId` | 运行详情（含阶段与日志） |
| GET | `/api/team` | 团队成员名册 |

---

## 路由概览

| 路由 | 页面 |
|------|------|
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
| `/pipelines/:runId` | 运行详情 |
| `/team` | 团队 |
| `/settings` | 设置 |

---

## 致谢

- [Yohaku / 余白](https://github.com/Innei/Yohaku) — 设计系统设计契约与灵感来源（MIT）
- [lucide-react](https://lucide.dev/) — 图标库
- [Inter](https://rsms.me/inter/) · [Noto Serif SC](https://fonts.google.com/noto/specimen/Noto+Serif+SC) · [JetBrains Mono](https://www.jetbrains.com/lp/mono/) — 字体

---

## 许可

MIT
