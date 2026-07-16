import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useTitle } from "@/hooks/useTitle";

export default function Privacy() {
  useTitle("隐私政策 · CodeZone");
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
          <span className="text-neutral-8">隐私政策</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-2">
            法律
          </p>
          <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            隐私政策
          </h1>
          <p className="mt-3 text-copy-13 text-neutral-5 dark:text-[var(--neutral-5)]">
            最近更新:2026 年 7 月
          </p>
        </div>

        <section className="space-y-3 text-copy-14 text-neutral-7 dark:text-[var(--neutral-7)] leading-relaxed">
          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">1. 我们收集什么</h2>
          <p>
            为提供账户与协作功能,我们会收集:邮箱、姓名、头像(可选)、你或团队管理员主动上传的代码、文档、议题等内容,以及使用过程中产生的访问日志。
          </p>

          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] pt-4">2. 我们如何使用</h2>
          <p>
            数据仅用于:向你与你的团队提供、维持并改进 CodeZone;安全审计与异常检测;在你或管理员明确要求时同步到 GitHub 等第三方服务。不会用于广告或训练。
          </p>

          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] pt-4">3. 存储与传输</h2>
          <p>
            数据在传输中使用 HTTPS 加密,存储于访问受控的数据库。除非你或团队管理员明确导出,否则不会共享给任何第三方。
          </p>

          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] pt-4">4. 你的权利</h2>
          <p>
            你可随时访问、更正或删除自己的数据,也可注销账户。注销后,你的个人识别信息会在 30 天内从生产环境清除,匿名化的统计数据可能保留。
          </p>

          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] pt-4">5. Cookie 与本地存储</h2>
          <p>
            我们使用必要 Cookie 与 sessionStorage 维持登录态;不使用任何第三方追踪 Cookie。
          </p>
        </section>

        <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] pt-6 border-t border-border">
          详见 <Link to="/terms" className="text-[var(--color-accent)] hover:underline">服务条款</Link>。
        </p>
      </main>
    </div>
  );
}
