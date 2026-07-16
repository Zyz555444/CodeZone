import { useState, type FormEvent } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { ChevronRight, Send } from "lucide-react";
import { api } from "@/lib/api";
import type { Repo, Issue } from "@/lib/types";
import { Button } from "@/components/ui/Button";

const priorityOptions: { value: Issue["priority"]; label: string }[] = [
  { value: "low", label: "低" },
  { value: "normal", label: "中" },
  { value: "high", label: "高" },
];

export default function IssueNew() {
  const { repo } = useOutletContext<{ repo: Repo }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Issue["priority"]>("normal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createIssue(repo.id, {
        title: title.trim(),
        body: body.trim(),
        priority,
      });
      navigate(`/repos/${repo.id}/issues/${created.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <nav className="reveal flex items-center gap-1.5 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
        <Link
          to={`/repos/${repo.id}/issues`}
          className="hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe"
        >
          议题
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-neutral-7 dark:text-[var(--neutral-7)]">新建议题</span>
      </nav>

      {/* 标题 */}
      <header className="reveal reveal-1">
        <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-1.5">
          New Issue
        </p>
        <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          新建议题
        </h1>
      </header>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="card reveal reveal-2 space-y-5">
        {/* 标题 */}
        <div>
          <label className="block text-label-12 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-2">
            标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="一句话描述这个议题"
            autoFocus
            className="w-full rounded-md bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border px-3 py-2 text-copy-15 text-neutral-9 dark:text-[var(--neutral-9)] placeholder:text-neutral-5 dark:placeholder:text-[var(--neutral-5)] focus:outline-none focus:ring-[var(--color-accent)] transition-colors duration-300 ease-breathe"
          />
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-label-12 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-2">
            描述
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="补充背景、复现步骤、期望行为…"
            rows={8}
            className="w-full resize-y rounded-md bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border px-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] placeholder:text-neutral-5 dark:placeholder:text-[var(--neutral-5)] focus:outline-none focus:ring-[var(--color-accent)] transition-colors duration-300 ease-breathe"
          />
        </div>

        {/* 优先级 */}
        <div>
          <label className="block text-label-12 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-2">
            优先级
          </label>
          <div className="flex items-center gap-2">
            {priorityOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setPriority(o.value)}
                className={
                  "rounded-md px-3 py-1.5 text-copy-14 ring-1 transition-colors duration-300 ease-breathe " +
                  (priority === o.value
                    ? "ring-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "ring-border text-neutral-7 dark:text-[var(--neutral-7)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)]")
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <p className="text-label-12 text-error">{error}</p>
        )}

        {/* 操作 */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={!title.trim() || submitting}>
            <Send className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
            {submitting ? "提交中…" : "提交议题"}
          </Button>
        </div>
      </form>
    </div>
  );
}
