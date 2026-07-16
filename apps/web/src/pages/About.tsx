import { Hash, Heart, Code2, Users, GitBranch, BookOpen } from "lucide-react";

export default function About() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div className="reveal">
        <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-2">
          关于
        </p>
        <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          关于 CodeZone
        </h1>
        <p className="mt-3 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed">
          CodeZone 是一体化协作开发平台，把代码仓库、议题、合并请求、讨论、文档与流水线收进同一个克制的工作空间。
        </p>
      </div>

      <section className="reveal reveal-1 card">
        <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4">
          我们的理念
        </h2>
        <p className="text-copy-14 text-neutral-7 dark:text-[var(--neutral-7)] leading-relaxed mb-4">
          好的工具应当减少噪音、放大专注。我们相信：
        </p>
        <ul className="space-y-2 text-copy-14 text-neutral-7 dark:text-[var(--neutral-7)]">
          <li className="flex items-start gap-2">
            <Heart className="w-4 h-4 mt-0.5 text-[var(--color-accent)]" strokeWidth={1.75} />
            <span>以开发者为先，让代码协作回归简单。</span>
          </li>
          <li className="flex items-start gap-2">
            <Code2 className="w-4 h-4 mt-0.5 text-[var(--color-accent)]" strokeWidth={1.75} />
            <span>代码、评审、交付在同一个上下文里完成。</span>
          </li>
          <li className="flex items-start gap-2">
            <Users className="w-4 h-4 mt-0.5 text-[var(--color-accent)]" strokeWidth={1.75} />
            <span>异步讨论与实时协作并重，适合分布式团队。</span>
          </li>
        </ul>
      </section>

      <section className="reveal reveal-2 card">
        <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4">
          核心模块
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: GitBranch, label: "代码仓库", desc: "浏览文件、提交、分支与合并历史" },
            { icon: Code2, label: "议题与看板", desc: "跟踪任务、缺陷与迭代进度" },
            { icon: BookOpen, label: "文档与 Wiki", desc: "团队知识库与协作编辑" },
            { icon: Hash, label: "流水线", desc: "持续集成与交付运行状态" },
          ].map((m) => (
            <div key={m.label} className="rounded-lg p-3 bg-neutral-2 dark:bg-[var(--neutral-2)]">
              <div className="flex items-center gap-2 mb-1">
                <m.icon className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.75} />
                <span className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                  {m.label}
                </span>
              </div>
              <p className="text-label-12 text-neutral-6 dark:text-[var(--neutral-6)]">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
