import { ArrowLeft, Hash, GitBranch, GitPullRequest, MessageSquare, BookOpen, Workflow, Flag, Users, Boxes, Sparkles, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useTitle } from "@/hooks/useTitle";

const modules = [
  { Icon: GitBranch, title: "代码仓库", desc: "分支、评审、合并请求一气呵成" },
  { Icon: Boxes, title: "议题跟踪", desc: "标签、看板、优先级与自动化工作流" },
  { Icon: GitPullRequest, title: "合并请求", desc: "Diff 视图、行内评论与审批链" },
  { Icon: MessageSquare, title: "代码评审", desc: "围绕提交的讨论,可逐行批注" },
  { Icon: MessageSquare, title: "讨论区", desc: "异步、跨议题、跨仓库的开放式对话" },
  { Icon: BookOpen, title: "Wiki 文档", desc: "协作文档与版本回溯" },
  { Icon: Workflow, title: "流水线", desc: "构建、测试、部署全链路可观测" },
  { Icon: Flag, title: "里程碑", desc: "Roadmap 视图与到期提醒" },
  { Icon: Users, title: "团队协作", desc: "角色、权限、邀请码与审计" },
];

export default function About() {
  useTitle("关于 · CodeZone");
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
          <span className="text-neutral-8">关于</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="reveal">
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-2">
            关于
          </p>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="grid place-items-center w-8 h-8 rounded-md bg-[var(--color-accent)] text-white">
              <Hash className="w-4 h-4" strokeWidth={2.5} />
            </span>
            <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
              CodeZone
            </h1>
          </div>
          <p className="text-copy-15 text-neutral-7 dark:text-[var(--neutral-7)] leading-relaxed">
            CodeZone 是一体化协作开发平台。我们相信好的协作工具,应该像水一样流进团队的工作节奏里,而不是要求团队为工具改变节奏。
          </p>
        </div>

        <section className="reveal reveal-1 card">
          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4 flex items-center gap-2">
            <Sparkles className="w-icon-md h-icon-md text-[var(--color-accent)]" strokeWidth={1.75} />
            我们关心的事
          </h2>
          <ul className="space-y-3 text-copy-14 text-neutral-7 dark:text-[var(--neutral-7)]">
            <li><strong className="text-neutral-9">专注。</strong>界面克制,信息密度合理,把每一像素都用在推进工作上。</li>
            <li><strong className="text-neutral-9">连接。</strong>代码、议题、文档、流水线围绕同一份上下文流动,避免在多工具间反复切换。</li>
            <li><strong className="text-neutral-9">可观测。</strong>每一次合并、每一次发布、每一次事故都留有可回溯的痕迹。</li>
            <li><strong className="text-neutral-9">开放。</strong>代码开源、协议透明,数据可迁移。</li>
          </ul>
        </section>

        <section className="reveal reveal-2">
          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4">
            九大核心模块
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {modules.map((m) => (
              <div
                key={m.title}
                className="p-4 rounded-md ring-1 ring-border bg-neutral-1 dark:bg-[var(--neutral-1)] hover:ring-[var(--color-accent)] transition-shadow"
              >
                <m.Icon className="w-icon-md h-icon-md text-[var(--color-accent)] mb-2" strokeWidth={1.75} />
                <div className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">{m.title}</div>
                <div className="text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] mt-0.5">{m.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="reveal reveal-3 card text-copy-13 text-neutral-6 dark:text-[var(--neutral-6)] flex items-center gap-2">
          <Shield className="w-icon-sm h-icon-sm text-[var(--color-accent)]" strokeWidth={1.75} />
          采用 Yohaku 设计系统 · MIT 开源协议
        </section>
      </main>
    </div>
  );
}
