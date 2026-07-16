import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Play, GitBranch, Workflow } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime, formatDuration } from "@/lib/format";
import type { Pipeline, Repo } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusDot } from "@/components/ui/StatusDot";

export default function GlobalPipelines() {
  const navigate = useNavigate();
  const [items, setItems] = useState<(Pipeline & { repo: Repo })[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringRepo, setTriggeringRepo] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const repoList = await api.getRepos();
      setRepos(repoList);
      const grouped = await Promise.all(
        repoList.map((r) =>
          api.getPipelines(r.id).then((list) => list.map((p) => ({ ...p, repo: r }))),
        ),
      );
      setItems(grouped.flat().sort((a, b) => b.createdAt - a.createdAt));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleTrigger = async (repoId: string) => {
    if (triggeringRepo) return;
    setTriggeringRepo(repoId);
    try {
      await api.triggerPipeline(repoId);
      await load();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setTriggeringRepo(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="reveal flex items-start justify-between gap-4">
        <div>
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-1">
            跨仓库
          </p>
          <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            流水线
          </h1>
          <p className="mt-1.5 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] max-w-2xl leading-relaxed">
            持续集成与交付的运行节奏，跨仓库汇总。
          </p>
        </div>
        <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums">
          {loading ? "加载中…" : `${items.length} 个`}
        </span>
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))
          : items.length === 0
            ? (
              <div className="reveal card text-center py-16 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
                <Workflow className="w-8 h-8 mx-auto mb-3 opacity-40" strokeWidth={1.5} />
                暂无流水线运行
              </div>
            )
            : items.map((p, i) => (
                <div
                  key={p.id}
                  className={`reveal reveal-${(i % 6) + 1} card cursor-pointer hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe`}
                  onClick={() => navigate(`/pipelines/${p.id}`)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <StatusDot status={p.status} pulse={p.status === "running"} />
                        <span className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)] truncate">
                          {p.commitMessage}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] flex-wrap">
                        <Link
                          to={`/repos/${p.repo.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-neutral-6 dark:text-[var(--neutral-6)] hover:text-[var(--color-accent)]"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: p.repo.languageColor }}
                          />
                          {p.repo.name}
                        </Link>
                        <span>·</span>
                        <span className="font-mono">{p.commitSha.slice(0, 7)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 font-mono">
                          <GitBranch className="w-3 h-3" strokeWidth={1.75} />
                          {p.branch}
                        </span>
                        <span>·</span>
                        <Badge variant="outline">{p.trigger}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-copy-14 text-neutral-8 dark:text-[var(--neutral-8)] tabular-nums">
                          {formatDuration(p.durationMs)}
                        </div>
                        <div className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                          {relativeTime(p.createdAt)}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrigger(p.repoId);
                        }}
                        disabled={triggeringRepo === p.repoId}
                      >
                        <Play className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
                        {triggeringRepo === p.repoId ? "触发中…" : "运行"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
      </div>
    </div>
  );
}
