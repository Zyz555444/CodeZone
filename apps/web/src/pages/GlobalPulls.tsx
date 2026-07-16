import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  GitPullRequest, Check, X, Clock, MessageSquare,
} from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PullRequest, PRStatus, Repo, User } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

type FilterStatus = "all" | PRStatus;

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "open", label: "开放" },
  { key: "merged", label: "已合并" },
  { key: "closed", label: "已关闭" },
  { key: "draft", label: "草稿" },
];

const prStatusColor: Record<PRStatus, string> = {
  open: "#33a6b8",
  merged: "#5e9f7e",
  closed: "#787670",
  draft: "#a8a69f",
};

type CheckOverall = "none" | "success" | "failed" | "pending";

function checksOverall(checks: PullRequest["checks"]): CheckOverall {
  if (checks.length === 0) return "none";
  if (checks.some((c) => c.status === "failed")) return "failed";
  if (checks.every((c) => c.status === "success")) return "success";
  return "pending";
}

export default function GlobalPulls() {
  const [status, setStatus] = useState<FilterStatus>("all");
  const [items, setItems] = useState<(PullRequest & { repo: Repo })[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.getRepos(), api.getTeam().catch(() => [])])
      .then(([repos, team]) => {
        if (cancelled) return;
        setUsers(team);
        return Promise.all(
          repos.map((r) =>
            api.getPRs(r.id, status).then((prs) => prs.map((pr) => ({ ...pr, repo: r }))),
          ),
        ).then((grouped) => {
          if (cancelled) return;
          setItems(grouped.flat().sort((a, b) => b.number - a.number));
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const authorName = (id: string) => userMap.get(id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div className="reveal flex items-end justify-between gap-4">
        <div>
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-1">
            跨仓库
          </p>
          <h2 className="font-serif text-title-24 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            全部合并请求
          </h2>
        </div>
        <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums">
          {loading ? "加载中…" : `${items.length} 个`}
        </span>
      </div>

      {/* 状态 tabs */}
      <nav className="reveal reveal-1 flex items-center gap-1 border-b border-border overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={cn(
              "px-3.5 py-2 text-copy-14 whitespace-nowrap border-b-2 -mb-px transition-colors duration-300 ease-breathe",
              status === f.key
                ? "border-[var(--color-accent)] text-neutral-10 dark:text-[var(--neutral-10)] font-medium"
                : "border-transparent text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]",
            )}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {/* PR 列表 */}
      <div className="card p-0 overflow-hidden">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-4 border-b border-border last:border-0">
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          : items.length === 0
            ? (
              <div className="px-4 py-12 text-center text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
                暂无合并请求
              </div>
            )
            : items.map((pr, i) => {
                const overall = checksOverall(pr.checks);
                return (
                  <div
                    key={`${pr.repo.id}-${pr.id}`}
                    className={cn(
                      `reveal reveal-${(i % 6) + 1}`,
                      "block px-4 py-3.5 border-b border-border last:border-0",
                      "hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <GitPullRequest
                        className="w-icon-md h-icon-md mt-0.5 shrink-0"
                        strokeWidth={1.75}
                        style={{ color: prStatusColor[pr.status] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/repos/${pr.repo.id}/pulls/${pr.id}`}
                            className="text-copy-15 text-neutral-9 dark:text-[var(--neutral-9)] hover:text-[var(--color-accent)] truncate transition-colors duration-300 ease-breathe"
                          >
                            {pr.title}
                          </Link>
                          <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] shrink-0 tabular-nums">
                            #{pr.number}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] flex-wrap">
                          <Link
                            to={`/repos/${pr.repo.id}/pulls`}
                            className="inline-flex items-center gap-1 text-neutral-6 dark:text-[var(--neutral-6)] hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: pr.repo.languageColor }}
                            />
                            {pr.repo.name}
                          </Link>
                          <span className="text-neutral-4 dark:text-[var(--neutral-4)]">·</span>
                          <span className="font-mono">
                            {pr.sourceBranch} → {pr.targetBranch}
                          </span>
                          <span className="text-neutral-4 dark:text-[var(--neutral-4)]">·</span>
                          <span>{authorName(pr.authorId)}</span>
                          <span className="text-neutral-4 dark:text-[var(--neutral-4)]">·</span>
                          <span>{relativeTime(pr.updatedAt)}</span>
                        </div>
                      </div>
                      {/* 右侧元信息 */}
                      <div className="flex items-center gap-3 shrink-0 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                        {overall !== "none" &&
                          (overall === "success" ? (
                            <Check className="w-3.5 h-3.5 text-success" strokeWidth={1.75} />
                          ) : overall === "failed" ? (
                            <X className="w-3.5 h-3.5 text-error" strokeWidth={1.75} />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-warning" strokeWidth={1.75} />
                          ))}
                        {pr.commentCount > 0 && (
                          <span className="flex items-center gap-0.5 tabular-nums">
                            <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                            {pr.commentCount}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 font-mono tabular-nums">
                          <span className="text-success">+{pr.additions}</span>
                          <span className="text-error">-{pr.deletions}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
      </div>
    </div>
  );
}
