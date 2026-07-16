import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useOutletContext } from "react-router-dom";
import {
  GitPullRequest, Check, X, Clock, AlertCircle, ChevronDown,
  ChevronRight, FileCode,
} from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PullRequest, PRStatus, Repo, User, Comment } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";
import { StatusDot } from "@/components/ui/StatusDot";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const prStatusColor: Record<PRStatus, string> = {
  open: "#33a6b8",
  merged: "#5e9f7e",
  closed: "#787670",
  draft: "#a8a69f",
};

const fileStatusLabel: Record<"added" | "modified" | "removed", string> = {
  added: "新增",
  modified: "修改",
  removed: "删除",
};

const fileStatusColor: Record<"added" | "modified" | "removed", string> = {
  added: "#5e9f7e",
  modified: "#a87a3d",
  removed: "#a64953",
};

const STRATEGIES = [
  { key: "merge", label: "创建合并提交" },
  { key: "squash", label: "压缩并合并" },
  { key: "rebase", label: "变基并合并" },
] as const;

type CheckOverall = "none" | "success" | "failed" | "pending";

function checksOverall(checks: PullRequest["checks"]): CheckOverall {
  if (checks.length === 0) return "none";
  if (checks.some((c) => c.status === "failed")) return "failed";
  if (checks.every((c) => c.status === "success")) return "success";
  return "pending";
}

export default function PullDetail() {
  const { repo } = useOutletContext<{ repo: Repo }>();
  const { prId } = useParams<{ prId: string }>();
  const [pr, setPR] = useState<(PullRequest & { comments: Comment[] }) | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [treeOpen, setTreeOpen] = useState(true);
  const [strategy, setStrategy] = useState<(typeof STRATEGIES)[number]["key"]>("merge");
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  useEffect(() => {
    if (!prId) return;
    setLoading(true);
    Promise.all([api.getPR(repo.id, prId), api.getTeam().catch(() => [])])
      .then(([p, team]) => {
        setPR(p);
        setUsers(team);
      })
      .finally(() => setLoading(false));
  }, [repo.id, prId]);

  const handleMerge = async () => {
    if (!prId || merging || pr?.status !== "open") return;
    if (pr.checks.some((c) => c.status === "failed")) return;
    setMerging(true);
    setMergeError(null);
    try {
      const { pr: updated } = await api.mergePR(repo.id, prId, strategy);
      setPR((prev) => (prev ? { ...prev, ...updated } : prev));
      setStrategyOpen(false);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "合并失败");
    } finally {
      setMerging(false);
    }
  };

  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="py-16 text-center text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
        未找到该合并请求
      </div>
    );
  }

  const overall = checksOverall(pr.checks);
  const passed = pr.checks.filter((c) => c.status === "success").length;
  const hasFailed = pr.checks.some((c) => c.status === "failed");
  const author = userMap.get(pr.authorId);
  const strategyLabel = STRATEGIES.find((s) => s.key === strategy)?.label ?? STRATEGIES[0].label;

  return (
    <div className="space-y-6 pb-4">
      {/* 面包屑 */}
      <nav className="reveal flex items-center gap-1.5 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
        <Link to={`/repos/${repo.id}`} className="hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe">
          {repo.name}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/repos/${repo.id}/pulls`} className="hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe">
          合并请求
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-neutral-7 dark:text-[var(--neutral-7)]">#{pr.number}</span>
      </nav>

      {/* 标题 */}
      <div className="reveal reveal-1">
        <div className="flex items-start gap-3 flex-wrap">
          <GitPullRequest
            className="w-icon-md h-icon-md mt-1.5 shrink-0"
            strokeWidth={1.75}
            style={{ color: prStatusColor[pr.status] }}
          />
          <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)] leading-tight">
            {pr.title}
          </h1>
          <span className="text-copy-16 text-neutral-5 dark:text-[var(--neutral-5)] mt-1.5 tabular-nums">
            #{pr.number}
          </span>
          <span className="mt-1.5">
            <StatusDot status={pr.status} label />
          </span>
        </div>
        {/* 作者 + 评审者 */}
        <div className="mt-3 flex items-center gap-3 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] flex-wrap">
          {author && (
            <span className="flex items-center gap-1.5">
              <Avatar user={author} size="xs" />
              <span className="text-neutral-7 dark:text-[var(--neutral-7)]">{author.name}</span>
              <span>发起于 {relativeTime(pr.createdAt)}</span>
            </span>
          )}
          {pr.reviewers.length > 0 && (
            <>
              <span className="text-neutral-4 dark:text-[var(--neutral-4)]">·</span>
              <span className="flex items-center gap-1.5">
                <span>评审者</span>
                <div className="flex -space-x-1.5">
                  {pr.reviewers.map((rid) => {
                    const u = userMap.get(rid);
                    return u ? (
                      <Avatar key={rid} user={u} size="xs" className="ring-1 ring-paper" />
                    ) : null;
                  })}
                </div>
              </span>
            </>
          )}
        </div>
      </div>

      {/* 状态摘要条 */}
      <div className="reveal reveal-2 card flex items-center gap-4 flex-wrap text-label-12">
        <span className="flex items-center gap-1.5 font-mono text-neutral-8 dark:text-[var(--neutral-8)]">
          <GitPullRequest className="w-3.5 h-3.5 text-neutral-5" strokeWidth={1.75} />
          {pr.sourceBranch}
          <span className="text-neutral-4 dark:text-[var(--neutral-4)]">→</span>
          {pr.targetBranch}
        </span>
        <span className="text-neutral-4 dark:text-[var(--neutral-4)]">·</span>
        <span className="flex items-center gap-1.5 text-neutral-7 dark:text-[var(--neutral-7)]">
          {overall === "success" ? (
            <Check className="w-3.5 h-3.5 text-success" strokeWidth={1.75} />
          ) : overall === "failed" ? (
            <X className="w-3.5 h-3.5 text-error" strokeWidth={1.75} />
          ) : overall === "pending" ? (
            <Clock className="w-3.5 h-3.5 text-warning" strokeWidth={1.75} />
          ) : null}
          {pr.checks.length > 0 ? `${passed}/${pr.checks.length} 检查通过` : "无检查"}
        </span>
        <span className="text-neutral-4 dark:text-[var(--neutral-4)]">·</span>
        <span className="flex items-center gap-2 font-mono tabular-nums">
          <span className="text-success">+{pr.additions}</span>
          <span className="text-error">-{pr.deletions}</span>
          <span className="text-neutral-5 dark:text-[var(--neutral-5)]">{pr.changedFiles} 文件</span>
        </span>
      </div>

      {/* 文件树侧栏 + Diff */}
      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="reveal reveal-3 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">
          <button
            onClick={() => setTreeOpen((o) => !o)}
            className="flex items-center justify-between w-full rounded-md px-2 py-1.5 hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe"
          >
            <span className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
              文件
            </span>
            <ChevronRight
              className={cn(
                "w-icon-sm h-icon-sm text-neutral-5 transition-transform duration-300 ease-breathe",
                treeOpen && "rotate-90",
              )}
              strokeWidth={1.75}
            />
          </button>
          {treeOpen && (
            <ul className="mt-1 space-y-0.5">
              {pr.files.map((f, fi) => (
                <li key={f.path}>
                  <button
                    onClick={() =>
                      document
                        .getElementById(`file-${fi}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    title={f.path}
                    className="flex items-center gap-1.5 w-full text-left rounded-md px-2 py-1 hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe"
                  >
                    <FileCode className="w-3 h-3 shrink-0 text-neutral-5" strokeWidth={1.75} />
                    <span className="font-mono text-label-12 text-neutral-7 dark:text-[var(--neutral-7)] truncate">
                      {f.path}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Diff 视图 */}
        <div className="space-y-4 min-w-0">
          {pr.files.map((file, fi) => (
            <div key={file.path} id={`file-${fi}`} className="card p-0 overflow-hidden">
              {/* 文件头 */}
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-neutral-2 dark:bg-[var(--neutral-2)]">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode
                    className="w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)] shrink-0"
                    strokeWidth={1.75}
                  />
                  <span
                    className="font-mono text-copy-13 text-neutral-8 dark:text-[var(--neutral-8)] truncate"
                    title={file.path}
                  >
                    {file.path}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" color={fileStatusColor[file.status]}>
                    {fileStatusLabel[file.status]}
                  </Badge>
                  <span className="font-mono text-label-12 text-success tabular-nums">+{file.additions}</span>
                  <span className="font-mono text-label-12 text-error tabular-nums">-{file.deletions}</span>
                </div>
              </div>
              {/* Diff 行 */}
              <div className="overflow-x-auto font-mono text-copy-13">
                {file.hunks.map((hunk, hi) => (
                  <div key={hi}>
                    <div className="px-4 py-1 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] bg-neutral-3 dark:bg-[var(--neutral-3)] border-b border-border">
                      @@ -{hunk.oldStart} +{hunk.newStart} @@
                    </div>
                    {hunk.lines.map((line, li) => (
                      <div
                        key={li}
                        className={cn(
                          "flex items-start",
                          line.type === "add" && "bg-[var(--color-accent-soft)]",
                          line.type === "remove" && "bg-neutral-3 dark:bg-[var(--neutral-3)]",
                        )}
                      >
                        <span className="select-none opacity-40 w-10 text-right pr-2 shrink-0 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums">
                          {line.oldNumber ?? " "}
                        </span>
                        <span className="select-none opacity-40 w-10 text-right pr-2 shrink-0 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums">
                          {line.newNumber ?? " "}
                        </span>
                        <span className="w-5 text-center shrink-0 text-neutral-6 dark:text-[var(--neutral-6)]">
                          {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                        </span>
                        <span className="whitespace-pre flex-1 pr-4 text-neutral-8 dark:text-[var(--neutral-8)]">
                          {line.content}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 评论区 */}
      {pr.comments.length > 0 && (
        <section className="reveal reveal-4">
          <h3 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-3">
            评论 ({pr.comments.length})
          </h3>
          <div className="space-y-3">
            {pr.comments.map((c) => {
              const u = userMap.get(c.authorId);
              return (
                <div key={c.id} className="card">
                  <div className="flex items-start gap-3">
                    {u && <Avatar user={u} size="sm" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-label-12 flex-wrap">
                        <span className="font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                          {u?.name ?? c.authorId}
                        </span>
                        <span className="text-neutral-5 dark:text-[var(--neutral-5)]">
                          {relativeTime(c.createdAt)}
                        </span>
                        {c.lineNumber != null && (
                          <span className="text-neutral-5 dark:text-[var(--neutral-5)]">· L{c.lineNumber}</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-copy-14 text-neutral-8 dark:text-[var(--neutral-8)] whitespace-pre-wrap leading-relaxed">
                        {c.body}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 合并操作栏 */}
      <div className="sticky bottom-0 z-10 rounded-lg ring-1 ring-border bg-neutral-2 dark:bg-[var(--neutral-2)] px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-copy-14 min-w-0">
            {pr.status === "merged" ? (
              <>
                <Check className="w-icon-sm h-icon-sm text-success shrink-0" strokeWidth={1.75} />
                <span className="text-success">该合并请求已合并</span>
              </>
            ) : pr.status === "closed" ? (
              <>
                <X className="w-icon-sm h-icon-sm text-neutral-5 shrink-0" strokeWidth={1.75} />
                <span className="text-neutral-6 dark:text-[var(--neutral-6)]">该合并请求已关闭</span>
              </>
            ) : mergeError ? (
              <>
                <AlertCircle className="w-icon-sm h-icon-sm text-error shrink-0" strokeWidth={1.75} />
                <span className="text-error truncate">{mergeError}</span>
              </>
            ) : hasFailed ? (
              <>
                <AlertCircle className="w-icon-sm h-icon-sm text-error shrink-0" strokeWidth={1.75} />
                <span className="text-error">存在失败的检查，暂时无法合并</span>
              </>
            ) : (
              <>
                <Check className="w-icon-sm h-icon-sm text-success shrink-0" strokeWidth={1.75} />
                <span className="text-success">分支无冲突，可以合并</span>
              </>
            )}
          </div>
          {pr.status === "open" && (
            <div className="flex items-center gap-2">
              {/* 合并策略下拉 */}
              <div className="relative">
                <button
                  onClick={() => setStrategyOpen((o) => !o)}
                  disabled={merging}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-copy-14 text-neutral-7 dark:text-[var(--neutral-7)] ring-1 ring-border hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe disabled:opacity-40 disabled:pointer-events-none"
                >
                  {strategyLabel}
                  <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
                {strategyOpen && (
                  <div className="absolute right-0 bottom-full mb-1 w-44 rounded-md ring-1 ring-border bg-neutral-2 dark:bg-[var(--neutral-2)] py-1 z-20">
                    {STRATEGIES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => {
                          setStrategy(s.key);
                          setStrategyOpen(false);
                        }}
                        className={cn(
                          "block w-full text-left px-3 py-1.5 text-copy-14 transition-colors duration-300 ease-breathe",
                          s.key === strategy
                            ? "text-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                            : "text-neutral-7 dark:text-[var(--neutral-7)] hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)]",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="primary" disabled={hasFailed || merging} onClick={handleMerge}>
                {merging ? "合并中…" : "合并"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
