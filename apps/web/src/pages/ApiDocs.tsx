import { Terminal, Code2, Lock, AlertCircle } from "lucide-react";

const endpoints = [
  { method: "POST", path: "/auth/register", desc: "邮箱注册" },
  { method: "POST", path: "/auth/login", desc: "邮箱登录" },
  { method: "GET", path: "/auth/me", desc: "获取当前用户" },
  { method: "GET", path: "/auth/github", desc: "GitHub OAuth 入口" },
  { method: "GET", path: "/auth/google", desc: "Google OAuth 入口" },
  { method: "GET", path: "/repos", desc: "仓库列表" },
  { method: "GET", path: "/repos/:repoId/issues", desc: "议题列表" },
  { method: "GET", path: "/repos/:repoId/pulls", desc: "合并请求列表" },
  { method: "GET", path: "/pipelines/:repoId/pipelines", desc: "流水线运行列表" },
  { method: "GET", path: "/milestones", desc: "全部里程碑" },
];

export default function ApiDocs() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div className="reveal">
        <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-2">
          API
        </p>
        <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          API 参考
        </h1>
        <p className="mt-3 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed">
          CodeZone 提供 RESTful API，所有响应包裹在 <code className="text-label-12 bg-neutral-2 dark:bg-[var(--neutral-2)] px-1 rounded">{`{ data: ... }`}</code> 中。
        </p>
      </div>

      <section className="reveal reveal-1 card">
        <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.75} />
          认证
        </h2>
        <p className="text-copy-14 text-neutral-7 dark:text-[var(--neutral-7)] leading-relaxed mb-3">
          大部分接口需要在请求头中携带 JWT：
        </p>
        <pre className="p-3 rounded-md bg-neutral-2 dark:bg-[var(--neutral-2)] text-label-12 text-neutral-8 dark:text-[var(--neutral-8)] overflow-x-auto">
          Authorization: Bearer &lt;your-token&gt;
        </pre>
      </section>

      <section className="reveal reveal-2 card">
        <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.75} />
          常用端点
        </h2>
        <div className="space-y-2">
          {endpoints.map((e) => (
            <div
              key={e.path}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)]"
            >
              <span className="w-14 text-center text-label-11 font-mono px-1.5 py-0.5 rounded bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                {e.method}
              </span>
              <code className="text-label-12 font-mono text-neutral-8 dark:text-[var(--neutral-8)]">
                {e.path}
              </code>
              <span className="ml-auto text-label-12 text-neutral-6 dark:text-[var(--neutral-6)]">
                {e.desc}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="reveal reveal-3 flex items-start gap-2 p-3 rounded-md bg-warning/10 text-warning text-copy-13">
        <AlertCircle className="w-icon-sm h-icon-sm shrink-0 mt-0.5" strokeWidth={1.75} />
        <span>完整 API 文档正在完善中，当前列表为常用端点速查。</span>
      </div>
    </div>
  );
}
