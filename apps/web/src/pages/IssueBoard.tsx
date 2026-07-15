import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { MessageSquare, List, Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { Issue, Repo, User, IssueStatus } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusDot } from "@/components/ui/StatusDot";
import { cn } from "@/lib/utils";

const columns: { status: IssueStatus; label: string }[] = [
  { status: "open", label: "待办" },
  { status: "in_progress", label: "进行中" },
  { status: "review", label: "评审中" },
  { status: "closed", label: "已完成" },
];

export default function IssueBoard() {
  const { repo } = useOutletContext<{ repo: Repo }>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<IssueStatus | null>(null);

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
      .getIssues(repo.id, "all")
      .then(setIssues)
      .finally(() => setLoading(false));
  }, [repo.id]);

  const byStatus = useMemo(() => {
    const groups: Record<IssueStatus, Issue[]> = {
      open: [],
      in_progress: [],
      review: [],
      closed: [],
    };
    issues.forEach((i) => groups[i.status]?.push(i));
    return groups;
  }, [issues]);

  function handleDragStart(e: DragEvent, issue: Issue) {
    setDragId(issue.id);
    e.dataTransfer.setData("text/plain", issue.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: DragEvent, status: IssueStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== status) setDragOver(status);
  }

  async function handleDrop(e: DragEvent, status: IssueStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragOver(null);
    setDragId(null);
    if (!id) return;
    const issue = issues.find((it) => it.id === id);
    if (!issue || issue.status === status) return;
    // 乐观更新本地状态
    setIssues((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status } : it)),
    );
    try {
      const updated = await api.updateIssueStatus(repo.id, id, status);
      setIssues((prev) => prev.map((it) => (it.id === id ? updated : it)));
    } catch {
      // 失败回滚
      setIssues((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: issue.status } : it)),
      );
    }
  }

  return (
    <div className="space-y-6">
      <header className="reveal flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-1.5">
            Board
          </p>
          <h2 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            议题看板
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/repos/${repo.id}/issues`}
            className="flex items-center gap-1.5 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe"
          >
            <List className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
            列表视图
          </Link>
          <Link
            to={`/repos/${repo.id}/issues/new`}
            className="flex items-center gap-1.5 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe"
          >
            <Plus className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
            新建议题
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, c) => (
            <div key={c} className="space-y-3">
              <Skeleton className="h-8 w-full rounded-md" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col, ci) => {
            const colIssues = byStatus[col.status] ?? [];
            const isOver = dragOver === col.status;
            return (
              <section
                key={col.status}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragEnter={() => setDragOver(col.status)}
                onDragLeave={(e) => {
                  // 仅当离开整列容器时清除
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOver((v) => (v === col.status ? null : v));
                  }
                }}
                onDrop={(e) => handleDrop(e, col.status)}
                className={cn(
                  "reveal rounded-lg p-3 transition-colors duration-300 ease-breathe",
                  `reveal-${ci + 1}`,
                  "bg-neutral-2/60 dark:bg-[var(--neutral-2)]/60 ring-1 ring-border",
                  isOver && "ring-2 ring-[var(--color-accent)] bg-[var(--color-accent-soft)]",
                )}
              >
                {/* 列标题 + 计数 */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <StatusDot status={col.status} />
                    <span className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums">
                    {colIssues.length}
                  </span>
                </div>

                {/* 卡片堆叠 */}
                <div className="space-y-2.5 min-h-[4rem]">
                  {colIssues.map((issue) => {
                    const assignee = issue.assigneeId
                      ? userMap.get(issue.assigneeId)
                      : undefined;
                    return (
                      <article
                        key={issue.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, issue)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDragOver(null);
                        }}
                        className={cn(
                          "group rounded-lg bg-neutral-2 dark:bg-[var(--neutral-2)] ring-1 ring-border p-3 cursor-grab",
                          "hover:ring-[var(--color-accent)] hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe",
                          dragId === issue.id && "opacity-50 cursor-grabbing",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Link
                            to={`/repos/${repo.id}/issues/${issue.id}`}
                            className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)] group-hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe line-clamp-2"
                          >
                            {issue.title}
                          </Link>
                        </div>
                        <div className="mb-2.5">
                          <span className="font-mono text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums">
                            #{issue.number}
                          </span>
                        </div>
                        {issue.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {issue.labels.map((l) => (
                              <Badge key={l.id} color={l.color}>
                                {l.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          {assignee ? (
                            <Avatar user={assignee} size="sm" />
                          ) : (
                            <span className="text-label-12 text-neutral-4 dark:text-[var(--neutral-4)]">
                              未指派
                            </span>
                          )}
                          {issue.commentCount > 0 && (
                            <span className="flex items-center gap-1 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums">
                              <MessageSquare className="w-3 h-3" strokeWidth={1.75} />
                              {issue.commentCount}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  {colIssues.length === 0 && (
                    <div className="rounded-md border border-dashed border-border py-6 text-center text-label-12 text-neutral-4 dark:text-[var(--neutral-4)]">
                      拖入议题
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
