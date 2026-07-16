import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useTitle } from "@/hooks/useTitle";

export default function Terms() {
  useTitle("服务条款 · CodeZone");
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
          <span className="text-neutral-8">服务条款</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-2">
            法律
          </p>
          <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            服务条款
          </h1>
          <p className="mt-3 text-copy-13 text-neutral-5 dark:text-[var(--neutral-5)]">
            最近更新:2026 年 7 月
          </p>
        </div>

        <section className="space-y-3 text-copy-14 text-neutral-7 dark:text-[var(--neutral-7)] leading-relaxed">
          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">1. 接受条款</h2>
          <p>
            访问或使用 CodeZone 即表示你同意本服务条款。若你代表团队或组织使用,你须保证已获授权代表该主体接受本条款。
          </p>

          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] pt-4">2. 账户与权限</h2>
          <p>
            你应妥善保管账户凭证,不得与他人共享。对账户下发生的一切活动承担责任。团队管理员可邀请新成员并调整角色,角色变更即时生效。
          </p>

          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] pt-4">3. 用户内容</h2>
          <p>
            你保留对上传内容的权利。CodeZone 仅按你或团队管理员的指令处理、存储与展示这些内容,不会将其用于训练或对外公开。
          </p>

          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] pt-4">4. 禁止行为</h2>
          <p>
            不得利用 CodeZone 从事违反法律法规、侵犯他人权益、上传恶意代码或进行干扰服务正常运行的行为。
          </p>

          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] pt-4">5. 服务的变更与终止</h2>
          <p>
            我们可能随时修改、暂停或终止部分功能。重大变更会通过站内通知提前告知。你可随时导出数据或注销账户。
          </p>

          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] pt-4">6. 免责声明</h2>
          <p>
            服务按"现状"提供。在适用法律允许的范围内,我们不对服务的可用性、准确性或适销性作任何明示或暗示的担保。
          </p>
        </section>

        <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] pt-6 border-t border-border">
          如有疑问,可通过 <Link to="/about" className="text-[var(--color-accent)] hover:underline">关于页</Link> 找到我们。
        </p>
      </main>
    </div>
  );
}
