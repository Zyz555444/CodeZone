import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useNavigate } from "react-router-dom";
import { MessageSquare, Plus, LayoutGrid, Inbox } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Issue, Repo, User, IssueStatus } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusDot } from "@/components/ui/StatusDot";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | IssueStatus;

const filters: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "open", label: "待办" },
  { value: "in_progress", label: "进行中" },
  { value: "review", label: "评审中" },
  { value: "closed", label: "已关闭" },
];

export default function IssuesList() {
  const { repo } = useOutletContext<{ repo: Repo }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<FilterStatus>("all");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    team.forEach((u) => m.set(u.id, u));
    return m;
  }, [team]);

  useEffect(() => {
    api.getTeam().then(setTeam).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .getIssues(repo.id, status)
      .then(setIssues)
      .finally(() => setLoading(false));
  }, [repo.id, status]);

  return (
    <div className="space-y-6">
      {/* 标题 + 操作区 */}
      <header className="reveal flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-1.5">
            Issues
          </p>
          <h2 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            议题
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/repos/${repo.id}/issues/board`}
            className="flex items-center gap-1.5 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe"
          >
            <LayoutGrid className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
            看板视图
          </Link>
          <Button variant="ghost" size="sm" onClick={() => navigate("new")}>
            <Plus className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
            新建议题
          </Button>
        </div>
      </header>

      {/* 状态筛选 tabs */}
      <nav className="flex items-center gap-1 border-b border-border">
        {filters.map((f) => {
          const active = f.value === status;
          const count =
            f.value === "all" ? issues.length : issues.filter((i) => i.status === f.value).length;
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
                  {count}
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
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="w-6 h-6 rounded-full" />
              </div>
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="w-icon-lg h-icon-lg text-neutral-4 dark:text-[var(--neutral-4)]" strokeWidth={1.75} />
            <p className="mt-3 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
              暂无议题
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {issues.map((issue, i) => {
              const assignee = issue.assigneeId ? userMap.get(issue.assigneeId) : undefined;
              return (
                <li
                  key={issue.id}
                  className={cn("reveal", `reveal-${(i % 6) + 1}`)}
                >
                  <Link
                    to={`/repos/${repo.id}/issues/${issue.id}`}
                    className="group flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe"
                  >
                    <StatusDot status={issue.status} />
                    <span className="font-mono text-copy-13 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums shrink-0">
                      #{issue.number}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-copy-15 text-neutral-9 dark:text-[var(--neutral-9)] group-hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe">
                      {issue.title}
                    </span>
                    {issue.labels.length > 0 && (
                      <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        {issue.labels.slice(0, 2).map((l) => (
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
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
