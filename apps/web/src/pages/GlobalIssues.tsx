import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, Inbox, Globe2 } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Issue, Repo, User, IssueStatus } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusDot } from "@/components/ui/StatusDot";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | IssueStatus;

type AggregatedIssue = Issue & { repo: Repo };

const filters: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "open", label: "待办" },
  { value: "in_progress", label: "进行中" },
  { value: "review", label: "评审中" },
  { value: "closed", label: "已关闭" },
];

export default function GlobalIssues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<AggregatedIssue[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<FilterStatus>("all");

  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    team.forEach((u) => m.set(u.id, u));
    return m;
  }, [team]);

  useEffect(() => {
    api.getTeam().then(setTeam).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getRepos()
      .then((repos) =>
        Promise.all(repos.map((r) => api.getIssues(r.id).then((is) => is.map((i) => ({ ...i, repo: r }))))),
      )
      .then((groups) => groups.flat())
      .then((all) => {
        if (cancelled) return;
        // 按 number 倒序
        all.sort((a, b) => b.number - a.number);
        setIssues(all);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () => (status === "all" ? issues : issues.filter((i) => i.status === status)),
    [issues, status],
  );

  const countFor = (s: FilterStatus) =>
    s === "all" ? issues.length : issues.filter((i) => i.status === s).length;

  return (
    <div className="space-y-6">
      {/* 标题 + 副标题 */}
      <header className="reveal">
        <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-1.5 flex items-center gap-1.5">
          <Globe2 className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
          All Repositories
        </p>
        <h2 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          全部议题
        </h2>
        <p className="mt-2 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] max-w-2xl leading-relaxed">
          跨仓库聚合的议题视图。留白处即呼吸，关注当下需要你响应的事项。
        </p>
      </header>

      {/* 状态筛选 tabs */}
      <nav className="flex items-center gap-1 border-b border-border">
        {filters.map((f) => {
          const active = f.value === status;
          return (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                "relative px-3.5 py-2 text-copy-14 whitespace-nowrap border-b-2 -mb-px transition-colors duration-300 ease-breathe",
                active
                  ? "border-[var(--color-accent)] text-neutral-10 dark:text-[var(--neutral-10)] font-medium"
                  : "border-transparent text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]",
              )}
            >
              {f.label}
              {loading ? null : (
                <span className="ml-1.5 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums">
                  {countFor(f.value)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 议题列表 */}
      <div className="card reveal reveal-1 p-0 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-24 rounded-md" />
                <Skeleton className="w-6 h-6 rounded-full" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="w-icon-lg h-icon-lg text-neutral-4 dark:text-[var(--neutral-4)]" strokeWidth={1.75} />
            <p className="mt-3 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
              暂无议题
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((issue, i) => {
              const assignee = issue.assigneeId ? userMap.get(issue.assigneeId) : undefined;
              return (
                <li key={`${issue.repo.id}-${issue.id}`} className={cn("reveal", `reveal-${(i % 6) + 1}`)}>
                  <div
                    onClick={() => navigate(`/repos/${issue.repo.id}/issues/${issue.id}`)}
                    className="group flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe cursor-pointer"
                  >
                    <StatusDot status={issue.status} />
                    <span className="font-mono text-copy-13 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums shrink-0">
                      #{issue.number}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-copy-15 text-neutral-9 dark:text-[var(--neutral-9)] group-hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe">
                      {issue.title}
                    </span>
                    {/* 所属仓库 */}
                    <Link
                      to={`/repos/${issue.repo.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hidden md:flex items-center gap-1.5 shrink-0 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: issue.repo.languageColor }}
                      />
                      <span className="font-mono">{issue.repo.name}</span>
                    </Link>
                    {issue.labels.length > 0 && (
                      <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                        {issue.labels.slice(0, 1).map((l) => (
                          <Badge key={l.id} color={l.color}>
                            {l.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {assignee && <Avatar user={assignee} size="sm" />}
                    <span className="flex items-center gap-1 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] shrink-0 w-14 justify-end tabular-nums">
                      <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                      {issue.commentCount}
                    </span>
                    <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] shrink-0 w-20 text-right">
                      {relativeTime(issue.updatedAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
