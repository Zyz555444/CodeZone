import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTitle } from "@/hooks/useTitle";

export default function ForgotPassword() {
  useTitle("重置密码 · CodeZone");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // 接入后端 /auth/forgot-password 后在此 fetch 即可
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(true);
    setLoading(false);
    // 移除自动跳转:给用户充足时间阅读成功提示
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-serif text-title-24 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            重置密码
          </h1>
          <p className="mt-2 text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)]">
            输入注册邮箱,我们会向你发送重置链接。
          </p>
        </div>

        {submitted ? (
          <div className="reveal card text-center py-8 space-y-3">
            <CheckCircle2 className="w-8 h-8 mx-auto text-success" strokeWidth={1.75} />
            <p className="text-copy-14 text-neutral-8 dark:text-[var(--neutral-8)]">
              如果该邮箱已注册,几分钟内会收到一封重置邮件。
            </p>
            <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
              邮件可能在垃圾邮件夹里,请留意。
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline text-copy-14"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> 返回登录
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
              <label htmlFor="email" className="sr-only">邮箱地址</label>
              <input
                id="email"
                type="email"
                required
                placeholder="邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-2 dark:bg-[var(--neutral-2)] ring-1 ring-border rounded-md pl-9 pr-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] placeholder:text-neutral-5 dark:placeholder:text-[var(--neutral-5)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none transition-shadow duration-300 ease-breathe"
                aria-label="邮箱地址"
              />
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? "发送中…" : "发送重置链接"}
            </Button>
            <div className="flex justify-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] hover:text-[var(--color-accent)]"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> 返回登录
              </Link>
            </div>
          </form>
        )}

        <div className="flex items-start gap-2 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
          <ShieldCheck className="w-icon-sm h-icon-sm shrink-0 mt-0.5" strokeWidth={1.75} />
          <span>重置链接 30 分钟内有效;出于安全,我们不暴露账户是否存在。</span>
        </div>
      </div>
    </div>
  );
}
