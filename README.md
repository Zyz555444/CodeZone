# CodeZone

> 留白也是写作的一部分。

CodeZone 是一个面向编程团队的一体化协作开发平台 —— 将代码仓库、议题追踪、合并请求评审、团队讨论、文档知识库与流水线可视化整合在同一个克制、专注的工作空间中。

采用 [Yohaku（余白）设计系统](https://github.com/Innei/Yohaku) 的设计哲学：以「留白即写作」为核心理念，克制色彩、呼吸式动效、衬线标题，把注意力还给内容本身。

---

## 核心特性

| 模块 | 能力 |
|------|------|
| **工作台** | 个人活动流、待办汇总、跨仓库动态、统计概览 |
| **仓库** | 仓库列表、文件树浏览、代码阅读器、提交历史 |
| **议题** | 列表 / 看板双视图、标签、里程碑、指派、筛选、拖拽流转 |
| **合并请求** | PR 列表、Diff 评审、行内评论、检查状态、合并操作 |
| **讨论** | 分类话题、多级评论、置顶 |
| **文档库** | Markdown 文档树、实时预览、Yohaku prose 排版 |
| **流水线** | CI/CD 运行列表、阶段可视化、日志流 |
| **团队** | 成员名册、角色管理 |
| **设置** | 个人资料、外观主题（浅/深）、通知偏好、安全 |

---

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS v3 + React Router v7 + Zustand
- **后端**：Express 4 + TypeScript（ESM）
- **设计系统**：Yohaku 设计令牌（移植至 Tailwind 配置 + CSS 变量）
- **图标**：lucide-react
- **Markdown**：react-markdown + remark-gfm
- **架构**：全栈同仓，前端通过 `/api` 代理到 Express，后端内存数据层零外部依赖，开箱即用

### 目录结构

```
.
├── api/                    # 后端 Express 服务
│   ├── db/                 # 仓储层与种子数据
│   │   ├── seed.ts
│   │   └── store.ts
│   ├── routes/             # REST 路由 (Controller 层)
│   │   ├── dashboard.ts
│   │   ├── discussions.ts
│   │   ├── issues.ts
│   │   ├── pipelines.ts
│   │   ├── pulls.ts
│   │   ├── repos.ts
│   │   └── team.ts
│   ├── app.ts              # Express 应用
│   └── server.ts           # 本地服务入口
├── shared/                 # 前后端共享类型
│   └── types.ts
├── src/                    # 前端 React 应用
│   ├── components/
│   │   ├── layout/         # 全局布局 (Sidebar / TopBar / RepoLayout)
│   │   └── ui/             # 基础组件 (Button / Avatar / Badge / StatusDot / Skeleton)
│   ├── hooks/              # useTheme
│   ├── lib/                # api 客户端、格式化工具、类型重导出
│   ├── pages/              # 全部页面
│   ├── store/              # Zustand 状态
│   ├── App.tsx             # 路由配置
│   ├── main.tsx
│   └── index.css           # Yohaku 主题变量与全局样式
├── tailwind.config.js      # Yohaku 设计令牌
├── vite.config.ts
└── package.json
```

---

## 快速开始

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 9（推荐）

### 安装与运行

```bash
pnpm install
pnpm dev
```

启动后：

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001/api

前端开发服务器已配置 `/api` 代理至后端，无需额外设置。

### 可用脚本

| 命令 | 用途 |
|------|------|
| `pnpm dev` | 同时启动前端与后端开发服务器 |
| `pnpm client:dev` | 仅启动前端 |
| `pnpm server:dev` | 仅启动后端（nodemon 热重载） |
| `pnpm build` | 类型检查 + 构建前端生产包 |
| `pnpm check` | TypeScript 类型检查 |
| `pnpm lint` | ESLint 代码检查 |
| `pnpm preview` | 预览生产构建 |

---

## Yohaku 设计系统

本项目遵循 Yohaku 设计契约，核心理念为「留白即写作」。

### 设计令牌

| 维度 | 浅色 | 深色 |
|------|------|------|
| 纸面底色 | `#fefefb`（纸张本白） | `rgb(28,28,30)`（暖灰夜色） |
| 强调色 | `#33A6B8`（浅葱） | `#F596AA`（桃） |
| 中性灰 | `neutral-1` ~ `neutral-10`，三档（表面 / 边框 / 文字） | 自动反转为纯灰 |
| 缓动 | `cubic-bezier(0.22, 1, 0.36, 1)`（呼吸式） | 同左 |
| 基础字号 | 14px | 同左 |

### 不变量

1. 中性灰三档：`1–4` 表面/填充、`5–7` 边框/图标/次级文字、`8–10` 正文/标题
2. `neutral-5` 永不用于文字；`neutral-6` 仅小标签；`neutral-7` 次级文字
3. 强调色占比 ≤ 5%，仅用于 CTA、焦点环、品牌标记
4. 字号令牌角色化：`caption-10 / label-12 / copy-13/14/15/16 / title-20/24/28 / display-36/48 / icon-sm/md/lg`
5. 标题用衬线（Noto Serif SC），CJK 永不 `font-bold`，最多 `font-medium`
6. 卡片以 `ring-1 ring-border` 承载分层，禁用硬阴影
7. 悬停仅颜色微深，无跳跃高亮

### 字体

- **无衬线（正文）**：Inter → PingFang SC → Microsoft YaHei → Noto Sans SC
- **衬线（标题）**：Noto Serif SC → Source Han Serif → Georgia
- **等宽（代码）**：JetBrains Mono → Fira Code → Consolas
- **Logo**：EB Garamond → Noto Serif SC

---

## API 概览

所有端点挂载于 `/api` 下，统一响应格式 `{ data, message? }`。

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/dashboard/activities` | 活动流 |
| GET | `/api/dashboard/stats` | 统计概览 |
| GET | `/api/repos` | 仓库列表 |
| GET | `/api/repos/:repoId` | 仓库详情 |
| GET | `/api/repos/:repoId/contents/*` | 文件树 / 文件内容 |
| GET | `/api/repos/:repoId/commits` | 提交历史 |
| GET | `/api/repos/:repoId/issues` | 议题列表（支持 `?status=`） |
| GET | `/api/repos/:repoId/issues/:issueId` | 议题详情 |
| PATCH | `/api/repos/:repoId/issues/:issueId` | 更新议题状态 |
| GET | `/api/repos/:repoId/pulls` | PR 列表 |
| GET | `/api/repos/:repoId/pulls/:prId` | PR 详情 + diff |
| POST | `/api/repos/:repoId/pulls/:prId/comments` | 添加行内评论 |
| GET | `/api/repos/:repoId/discussions` | 讨论列表 |
| GET | `/api/pipelines/:repoId/pipelines` | 流水线列表 |
| GET | `/api/pipelines/run/:runId` | 运行详情 + 日志 |
| GET | `/api/team` | 团队成员 |

---

## 路由地图

| 路由 | 页面 |
|------|------|
| `/dashboard` | 工作台 |
| `/repos` | 仓库列表 |
| `/repos/:repoId` | 仓库代码浏览 |
| `/repos/:repoId/commits` | 提交历史 |
| `/repos/:repoId/issues` | 议题列表 |
| `/repos/:repoId/issues/board` | 议题看板 |
| `/repos/:repoId/issues/:issueId` | 议题详情 |
| `/repos/:repoId/pulls` | PR 列表 |
| `/repos/:repoId/pulls/:prId` | PR 评审 |
| `/repos/:repoId/discussions` | 讨论 |
| `/repos/:repoId/wiki` | 文档库 |
| `/repos/:repoId/pipelines` | 流水线列表 |
| `/pipelines/:runId` | 流水线运行详情 |
| `/issues` | 全部议题（跨仓库） |
| `/pulls` | 全部合并请求（跨仓库） |
| `/team` | 团队 |
| `/settings` | 设置 |

---

## 主题

支持浅色（默认）/ 深色双主题，遵循 Yohaku 契约：

- **浅色**：纸白底 + 浅葱强调
- **深色**：暖灰底 + 桃强调

主题通过 `data-theme` 属性 + CSS 变量切换，无闪烁过渡。在顶栏点击太阳/月亮图标切换，偏好持久化至 `localStorage`。

---

## 许可

MIT
