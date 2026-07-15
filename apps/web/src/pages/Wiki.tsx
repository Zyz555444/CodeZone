import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Repo } from "@/lib/types";

interface RepoContext {
  repo: Repo;
}

export default function Wiki() {
  const { repo } = useOutletContext<RepoContext>();
  const [active, setActive] = useState(0);

  const docs = [
    {
      title: "快速开始",
      content: `# 快速开始

欢迎使用 **${repo.name}**。本指南帮助你完成本地配置并运行首次构建。

## 环境要求

- Node.js ≥ 20
- pnpm ≥ 9
- Git

## 克隆与安装

\`\`\`bash
git clone git@codezone.dev:team/${repo.name}.git
cd ${repo.name}
pnpm install
\`\`\`

## 启动开发服务器

\`\`\`bash
pnpm dev
\`\`\`

开发服务器默认运行在 \`http://localhost:5173\`，支持热模块替换。

## 构建生产版本

\`\`\`bash
pnpm build
\`\`\`

产物输出至 \`dist/\` 目录，可直接部署到任意静态托管环境。

> 留白即专注。首次运行时请耐心等待依赖安装完成。
`,
    },
    {
      title: "架构说明",
      content: `# 架构说明

**${repo.name}** 采用分层架构，关注点分离，留白即边界。

## 目录结构

\`\`\`
src/
├── components/   # 通用 UI 组件
├── pages/        # 路由页面
├── lib/          # 工具函数与 API 客户端
├── store/        # 全局状态 (Zustand)
└── hooks/        # 自定义 Hooks
\`\`\`

## 设计原则

1. **克制** — 颜色不超过三档，留白优先于装饰
2. **呼吸** — 过渡使用 \`cubic-bezier(0.22, 1, 0.36, 1)\` 缓动
3. **衬线** — 标题使用 Noto Serif SC，与正文形成节奏

## 状态管理

全局状态使用 Zustand，避免 Provider 嵌套。仓库级状态通过 URL 参数与 Outlet Context 传递，保持单一数据源。

## 数据流

\`\`\`
用户交互 → URL 变更 → 路由参数 → API 请求 → 组件渲染
\`\`\`

所有异步数据通过 \`api\` 客户端获取，组件内部用 \`useState\` + \`useEffect\` 管理加载态。
`,
    },
    {
      title: "贡献指南",
      content: `# 贡献指南

感谢你参与 **${repo.name}** 的建设。以下约定帮助团队保持一致的节奏。

## 开发流程

1. 从 \`main\` 拉取最新代码
2. 创建特性分支：\`feat/your-feature\`
3. 提交时遵循 Conventional Commits 规范
4. 发起合并请求并指定至少一位评审人

## 提交信息规范

\`\`\`
<type>(<scope>): <subject>

<body>
\`\`\`

常用 type：

| type       | 用途           |
| ---------- | -------------- |
| \`feat\`   | 新功能         |
| \`fix\`    | 缺陷修复       |
| \`docs\`   | 文档变更       |
| \`refactor\` | 重构（无行为变化） |
| \`test\`   | 测试相关       |
| \`chore\`  | 构建/工具变更  |

## 代码评审

- 评审应在 24 小时内响应
- 聚焦于正确性与可读性，不纠缠个人偏好
- 对留白与命名提出建议时，请给出理由

## 分支策略

- \`main\` — 始终可发布的稳定分支
- \`develop\` — 集成分支
- \`feat/*\` — 特性开发
- \`fix/*\` — 缺陷修复

> 节奏比速度更重要。每一次合并都应是可回退的。
`,
    },
  ];

  const current = docs[active];

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-6">
      {/* 文档列表 */}
      <aside className="card p-2 reveal">
        <p className="px-2 py-1.5 text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
          文档
        </p>
        <nav className="space-y-0.5">
          {docs.map((doc, i) => (
            <button
              key={doc.title}
              onClick={() => setActive(i)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-copy-14 transition-colors duration-300 ease-breathe hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)]",
                i === active
                  ? "text-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                  : "text-neutral-7 dark:text-[var(--neutral-7)]",
              )}
            >
              <FileText
                className="w-icon-sm h-icon-sm shrink-0"
                strokeWidth={1.75}
              />
              <span className="truncate">{doc.title}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 文档内容 */}
      <section className="min-w-0">
        <div className="prose-yohaku reveal" key={active}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {current.content}
          </ReactMarkdown>
        </div>
      </section>
    </div>
  );
}
