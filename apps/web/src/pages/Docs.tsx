import { useEffect } from "react";
import { BookOpen, FileText, Terminal, Shield, HelpCircle, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTitle } from "@/hooks/useTitle";

const docLinks = [
  { icon: FileText, label: "快速开始", desc: "创建团队、导入仓库、发起第一个议题", to: "/docs", hash: "" },
  { icon: Terminal, label: "API 参考", desc: "RESTful API 端点与认证说明", to: "/api", hash: "" },
  { icon: Shield, label: "服务条款", desc: "使用 CodeZone 的条款与条件", to: "/terms", hash: "" },
  { icon: Shield, label: "隐私政策", desc: "我们如何收集、使用与保护数据", to: "/privacy", hash: "" },
  { icon: HelpCircle, label: "常见问题", desc: "OAuth 登录、邀请码与权限说明", to: "/docs", hash: "#faq" },
];

const faqs = [
  {
    q: "GitHub / Google 登录不可用怎么办?",
    a: "当前部署环境未配置 GITHUB_CLIENT_ID / GOOGLE_CLIENT_ID,因此 OAuth 不可用。管理员设置环境变量后,登录页底部的「使用 GitHub 继续」按钮即可使用。",
  },
  {
    q: "邀请码从哪里获取?",
    a: "团队成员在「设置 → 团队管理 → 邀请码」中生成。默认 7 天有效,可设置使用次数。",
  },
  {
    q: "权限模型是怎样的?",
    a: "CodeZone 区分账户级角色(admin / maintainer / member)与团队级角色(owner / admin / member)。仓库读写、议题编辑、合并请求合入均校验对应的团队角色。",
  },
  {
    q: "本地能跑起来吗?",
    a: "可以。apps/api 默认 3001 端口,apps/web 默认 5173 端口,根目录执行 pnpm install && pnpm dev 即可。数据库使用 SQLite,首次启动自动迁移。",
  },
  {
    q: "数据存储在哪里?",
    a: "默认 SQLite 文件位于 apps/database/data.db。生产环境推荐改用 PostgreSQL,只需修改 DATABASE_URL。",
  },
];

export default function Docs() {
  const location = useLocation();
  useTitle("文档 · CodeZone");

  // 锚点定位 — 来自 /docs#faq 跳转
  useEffect(() => {
    if (location.hash === "#faq") {
      const el = document.getElementById("faq");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-paper">
      {/* 顶部条 — 替代孤立的"文档"标签,提供返回入口 */}
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
          <span className="text-neutral-8">文档</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="reveal">
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-2">
            文档
          </p>
          <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            CodeZone 文档
          </h1>
          <p className="mt-3 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed">
            快速上手、API 参考与使用政策的汇总入口。
          </p>
        </div>

        <section className="reveal reveal-1 card">
          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4 flex items-center gap-2">
            <BookOpen className="w-icon-md h-icon-md text-[var(--color-accent)]" strokeWidth={1.75} />
            快速开始
          </h2>
          <ol className="space-y-3 text-copy-14 text-neutral-7 dark:text-[var(--neutral-7)] list-decimal list-inside">
            <li>注册或登录你的 CodeZone 账户。</li>
            <li>创建团队或输入邀请码加入已有团队。</li>
            <li>在「仓库」页导入 GitHub 仓库或浏览已有仓库。</li>
            <li>使用议题、合并请求、讨论与流水线组织协作。</li>
          </ol>
        </section>

        <section className="reveal reveal-2 grid sm:grid-cols-2 gap-3">
          {docLinks.map((d) => (
            <Link
              key={d.label}
              to={`${d.to}${d.hash}`}
              className="card p-4 hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe"
            >
              <div className="flex items-center gap-2 mb-1">
                <d.icon className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.75} />
                <span className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                  {d.label}
                </span>
              </div>
              <p className="text-label-12 text-neutral-6 dark:text-[var(--neutral-6)]">{d.desc}</p>
            </Link>
          ))}
        </section>

        <section id="faq" className="reveal reveal-3 card scroll-mt-20">
          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4 flex items-center gap-2">
            <HelpCircle className="w-icon-md h-icon-md text-[var(--color-accent)]" strokeWidth={1.75} />
            常见问题
          </h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-md ring-1 ring-border bg-neutral-1 dark:bg-[var(--neutral-1)] open:ring-[var(--color-accent)] transition-shadow"
              >
                <summary className="flex items-center justify-between gap-2 cursor-pointer list-none p-3 text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                  <span>{f.q}</span>
                  <span className="text-neutral-5 group-open:rotate-90 transition-transform">›</span>
                </summary>
                <p className="px-3 pb-3 text-copy-13 text-neutral-7 dark:text-[var(--neutral-7)] leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
