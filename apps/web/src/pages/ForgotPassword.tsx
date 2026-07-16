import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // 当前为演示功能，实际应调用后端发送重置邮件
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-serif text-title-24 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            重置密码
          </h1>
          <p className="mt-2 text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)]">
            输入注册邮箱，我们将向你发送重置链接。
          </p>
        </div>

        {submitted ? (
          <div className="reveal card text-center py-8 space-y-3">
            <CheckCircle2 className="w-8 h-8 mx-auto text-success" strokeWidth={1.75} />
            <p className="text-copy-14 text-neutral-8 dark:text-[var(--neutral-8)]">
              如果该邮箱已注册，你会收到一封重置邮件。
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline text-copy-14"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 返回登录
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
          <AlertCircle className="w-icon-sm h-icon-sm shrink-0 mt-0.5" strokeWidth={1.75} />
          <span>当前为演示流程。生产环境需接入邮件服务以真正发送重置链接。</span>
        </div>
      </div>
    </div>
  );
}
