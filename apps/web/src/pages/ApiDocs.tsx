import { ArrowLeft, Terminal, Lock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTitle } from "@/hooks/useTitle";

const endpoints = [
  { method: "POST", path: "/auth/register", desc: "邮箱注册" },
  { method: "POST", path: "/auth/login", desc: "邮箱登录" },
  { method: "POST", path: "/auth/register-admin", desc: "创建团队并注册为 owner" },
  { method: "POST", path: "/auth/join-by-invite", desc: "通过邀请码加入团队" },
  { method: "GET", path: "/auth/providers", desc: "查询可用的第三方登录" },
  { method: "GET", path: "/auth/me", desc: "获取当前用户" },
  { method: "GET", path: "/auth/github", desc: "GitHub OAuth 入口" },
  { method: "GET", path: "/auth/google", desc: "Google OAuth 入口" },
  { method: "GET", path: "/repos", desc: "仓库列表" },
  { method: "POST", path: "/repos", desc: "创建仓库" },
  { method: "GET", path: "/repos/:repoId", desc: "仓库详情" },
  { method: "GET", path: "/repos/:repoId/issues", desc: "议题列表" },
  { method: "POST", path: "/repos/:repoId/issues", desc: "创建议题" },
  { method: "GET", path: "/repos/:repoId/pulls", desc: "合并请求列表" },
  { method: "GET", path: "/milestones", desc: "全部里程碑" },
  { method: "GET", path: "/activity", desc: "活动流" },
  { method: "GET", path: "/dashboard/stats", desc: "工作台统计" },
  { method: "GET", path: "/team", desc: "当前团队详情" },
  { method: "GET", path: "/team/online", desc: "在线人数" },
  { method: "POST", path: "/team/leave", desc: "离开当前团队" },
];

export default function ApiDocs() {
  useTitle("API 文档 · CodeZone");
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-3 border-b border-border bg-paper/80 backdrop-blur-sm">
        <Link
          to="/"
          className="grid place-items-center w-8 h-8 rounded-md text-neutral-6 hover:bg-neutral-2 hover:text-[var(--color-accent)] transition-colors"
          aria-label="返回首页"
        >
          <ArrowLeft className="w-icon-md h-icon-md" strokeWidth={1.75} />
        </Link>
        <div className="flex items-center gap-2 text-label-12 text-neutral-6">
          <Link to="/" className="hover:text-[var(--color-accent)] transition-colors">CodeZone</Link>
          <span>/</span>
          <span className="text-neutral-8">API 文档</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="reveal">
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-2">
            接口
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
      </main>
    </div>
  );
}
