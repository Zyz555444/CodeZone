import { BookOpen, FileText, Terminal, Shield, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

const docLinks = [
  { icon: FileText, label: "快速开始", desc: "创建团队、导入仓库、发起第一个议题", to: "/docs" },
  { icon: Terminal, label: "API 参考", desc: "RESTful API 端点与认证说明", to: "/api" },
  { icon: Shield, label: "服务条款", desc: "使用 CodeZone 的条款与条件", to: "/terms" },
  { icon: Shield, label: "隐私政策", desc: "我们如何收集、使用与保护数据", to: "/privacy" },
  { icon: HelpCircle, label: "常见问题", desc: "OAuth 登录、邀请码与权限说明", to: "/docs" },
];

export default function Docs() {
  return (
    <div className="space-y-8 max-w-3xl">
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
        <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4">
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
            to={d.to}
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
    </div>
  );
}
