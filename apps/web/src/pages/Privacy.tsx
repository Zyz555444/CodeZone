export default function Privacy() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div className="reveal">
        <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-2">
          法律
        </p>
        <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          隐私政策
        </h1>
      </div>

      <section className="reveal reveal-1 card space-y-4 text-copy-14 text-neutral-7 dark:text-[var(--neutral-7)] leading-relaxed">
        <p>
          CodeZone 重视你的隐私。本政策说明我们收集哪些信息、如何使用与保护这些信息。
        </p>
        <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
          1. 我们收集的信息
        </h2>
        <p>
          包括账户信息（姓名、邮箱）、团队信息、仓库与协作数据，以及 OAuth 授权后第三方平台提供的公开资料。
        </p>
        <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
          2. 信息使用
        </h2>
        <p>
          我们使用这些信息来提供服务、改进产品、保障安全，并在必要时与你取得联系。
        </p>
        <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
          3. 信息共享
        </h2>
        <p>
          除法律法规要求或你明确同意外，我们不会向第三方出售你的个人信息。
        </p>
        <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
          4. 数据安全
        </h2>
        <p>
          我们采用加密传输、访问控制等技术手段保护你的数据，但无法保证绝对安全。
        </p>
        <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] pt-2">
          最后更新：2026 年 7 月
        </p>
      </section>
    </div>
  );
}
