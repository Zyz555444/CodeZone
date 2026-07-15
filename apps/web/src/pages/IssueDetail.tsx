import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { ChevronRight, MessageSquare, Flag, Milestone, Tag, Send } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime, formatDate } from "@/lib/format";
import type { Issue, Comment, Repo, User, IssueStatus } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusDot } from "@/components/ui/StatusDot";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

type IssueDetail = Issue & { comments: Comment[] };

const statusOptions: { value: IssueStatus; label: string }[] = [
  { value: "open", label: "待办" },
  { value: "in_progress", label: "进行中" },
  { value: "review", label: "评审中" },
  { value: "closed", label: "已关闭" },
];

const priorityMeta: Record<Issue["priority"], { label: string; color: string }> = {
  low: { label: "低", color: "#787670" },
  normal: { label: "中", color: "#3d6896" },
  high: { label: "高", color: "#a64953" },
};

export default function IssueDetail() {
  const { repo } = useOutletContext<{ repo: Repo }>();
  const { issueId } = useParams();
  const { currentUser } = useAppStore();
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [draft, setDraft] = useState("");

  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    team.forEach((u) => m.set(u.id, u));
    return m;
  }, [team]);

  useEffect(() => {
    api.getTeam().then(setTeam).catch(() => {});
  }, []);

  useEffect(() => {
    if (!issueId) return;
    setLoading(true);
    api
      .getIssue(repo.id, issueId)
      .then((data) => {
        setIssue(data);
        setComments(data.comments ?? []);
      })
      .finally(() => setLoading(false));
  }, [repo.id, issueId]);

  const assignee = issue?.assigneeId ? userMap.get(issue.assigneeId) : undefined;

  async function handleStatusChange(next: IssueStatus) {
    if (!issue || next === issue.status) return;
    setUpdatingStatus(true);
    const prev = issue.status;
    setIssue({ ...issue, status: next });
    try {
      const updated = await api.updateIssueStatus(repo.id, issue.id, next);
      setIssue((cur) => (cur ? { ...cur, status: updated.status } : cur));
    } catch {
      setIssue((cur) => (cur ? { ...cur, status: prev } : cur));
    } finally {
      setUpdatingStatus(false);
    }
  }

  function handleCommentSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !issue) return;
    const newComment: Comment = {
      id: `local-${Date.now()}`,
      targetType: "issue",
      targetId: issue.id,
      authorId: currentUser!.id,
      body: text,
      lineNumber: null,
      createdAt: Date.now(),
    };
    setComments((prev) => [...prev, newComment]);
    setDraft("");
  }

  if (loading || !issue) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-3/4" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <nav className="reveal flex items-center gap-1.5 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
        <Link to={`/repos/${repo.id}/issues`} className="hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe">
          议题
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="font-mono text-neutral-7 dark:text-[var(--neutral-7)]">#{issue.number}</span>
      </nav>

      {/* 标题 */}
      <header className="reveal reveal-1">
        <div className="flex items-start gap-3">
          <h1 className="flex-1 font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)] leading-tight">
            {issue.title}
          </h1>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="font-mono text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums">
            #{issue.number}
          </span>
          <StatusDot status={issue.status} label pulse={issue.status === "in_progress"} />
          <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
            创建于 {formatDate(issue.createdAt)}
          </span>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 讨论区 */}
        <div className="lg:col-span-2 space-y-5">
          {/* 议题描述 */}
          <div className="card reveal reveal-2">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <span className="text-label-12 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
                描述
              </span>
              <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                {relativeTime(issue.createdAt)}
              </span>
            </div>
            {issue.body ? (
              <div className="prose-yohaku whitespace-pre-wrap text-copy-15 text-neutral-8 dark:text-[var(--neutral-8)] leading-relaxed">
                {issue.body}
              </div>
            ) : (
              <p className="text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)] italic">
                无描述
              </p>
            )}
          </div>

          {/* 评论列表 */}
          <div className="space-y-3">
            <h3 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] flex items-center gap-2">
              <MessageSquare className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
              讨论
              <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] font-sans tabular-nums">
                {comments.length}
              </span>
            </h3>
            {comments.length === 0 ? (
              <div className="card text-center py-10 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
                还没有评论，说点什么吧
              </div>
            ) : (
              comments.map((c, i) => {
                const author = userMap.get(c.authorId);
                const fallbackName = c.authorId === currentUser?.id ? (currentUser?.name ?? "我") : "匿名";
                const user = author ?? { name: fallbackName, avatar: "" };
                return (
                  <div key={c.id} className={cn("card reveal", `reveal-${(i % 6) + 1}`)}>
                    <div className="flex items-start gap-3">
                      <Avatar user={user} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                            {user.name}
                          </span>
                          <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                            {relativeTime(c.createdAt)}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap text-copy-14 text-neutral-8 dark:text-[var(--neutral-8)] leading-relaxed">
                          {c.body}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 评论输入框 */}
          <form onSubmit={handleCommentSubmit} className="card reveal">
            <div className="flex items-start gap-3">
              <Avatar user={currentUser!} size="sm" />
              <div className="flex-1 min-w-0">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="留下你的想法…"
                  rows={3}
                  className="w-full resize-none rounded-md bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border px-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] placeholder:text-neutral-5 dark:placeholder:text-[var(--neutral-5)] focus:outline-none focus:ring-[var(--color-accent)] transition-colors duration-300 ease-breathe"
                />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                    Markdown 暂不支持，纯文本即可
                  </p>
                  <Button type="submit" variant="primary" size="sm" disabled={!draft.trim()}>
                    <Send className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
                    评论
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* 侧边栏 */}
        <aside className="space-y-4">
          {/* 状态 */}
          <div className="card reveal reveal-2">
            <h4 className="text-label-12 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-3">
              状态
            </h4>
            <div className="relative">
              <select
                value={issue.status}
                disabled={updatingStatus}
                onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
                className="w-full appearance-none rounded-md bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border px-3 py-2 pr-9 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] focus:outline-none focus:ring-[var(--color-accent)] transition-colors duration-300 ease-breathe disabled:opacity-50"
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <StatusDot status={issue.status} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* 指派人 */}
          <div className="card reveal reveal-3">
            <h4 className="text-label-12 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-3">
              指派人
            </h4>
            {assignee ? (
              <div className="flex items-center gap-2.5">
                <Avatar user={assignee} size="sm" />
                <span className="text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)]">
                  {assignee.name}
                </span>
              </div>
            ) : (
              <p className="text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)] italic">
                未指派
              </p>
            )}
          </div>

          {/* 标签 */}
          <div className="card reveal reveal-4">
            <h4 className="flex items-center gap-1.5 text-label-12 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-3">
              <Tag className="w-3 h-3" strokeWidth={1.75} />
              标签
            </h4>
            {issue.labels.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map((l) => (
                  <Badge key={l.id} color={l.color}>
                    {l.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)] italic">
                无标签
              </p>
            )}
          </div>

          {/* 里程碑 */}
          <div className="card reveal reveal-5">
            <h4 className="flex items-center gap-1.5 text-label-12 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-3">
              <Milestone className="w-3 h-3" strokeWidth={1.75} />
              里程碑
            </h4>
            {issue.milestone ? (
              <p className="text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)]">
                {issue.milestone}
              </p>
            ) : (
              <p className="text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)] italic">
                无里程碑
              </p>
            )}
          </div>

          {/* 优先级 */}
          <div className="card reveal reveal-6">
            <h4 className="flex items-center gap-1.5 text-label-12 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-3">
              <Flag className="w-3 h-3" strokeWidth={1.75} />
              优先级
            </h4>
            <div className="flex items-center gap-2">
              <StatusDot status={issue.priority === "high" ? "failed" : issue.priority === "normal" ? "review" : "closed"} />
              <span className="text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)]">
                {priorityMeta[issue.priority].label}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
