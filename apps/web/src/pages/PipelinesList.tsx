import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Play, ChevronDown, GitBranch } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime, formatDuration, shortSha } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Pipeline, PipelineStatus, Repo } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusDot } from "@/components/ui/StatusDot";

const stageColor: Record<PipelineStatus, string> = {
  success: "#5e9f7e",
  failed: "#a64953",
  running: "#a87a3d",
  pending: "#a8a69f",
};

export default function PipelinesList({ repoId }: { repoId?: string }) {
  const ctx = useOutletContext<{ repo: Repo } | null>();
  const rid = repoId ?? ctx?.repo.id ?? "r1";
  const navigate = useNavigate();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getPipelines(rid)
      .then(setPipelines)
      .finally(() => setLoading(false));
  }, [rid]);

  const handleTrigger = async () => {
    if (triggering) return;
    setTriggering(true);
    setTriggerError(null);
    try {
      await api.triggerPipeline(rid);
      const list = await api.getPipelines(rid);
      setPipelines(list);
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : "触发失败");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="reveal flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-title-24 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            流水线
          </h2>
          <p className="mt-1 text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)]">
            持续集成与交付的运行节奏
          </p>
          {triggerError && (
            <p className="mt-1 text-label-12 text-error">{triggerError}</p>
          )}
        </div>
        <Button variant="primary" size="md" onClick={handleTrigger} disabled={triggering}>
          <Play className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
          {triggering ? "触发中…" : "触发运行"}
        </Button>
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))
          : pipelines.map((p, i) => {
              const isOpen = expandedId === p.id;
              return (
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
                      <div className="mt-1.5 flex items-center gap-2 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                        <span className="font-mono">{shortSha(p.commitSha)}</span>
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isOpen ? null : p.id);
                        }}
                        className="p-1 rounded-md text-neutral-5 dark:text-[var(--neutral-5)] hover:bg-neutral-4 dark:hover:bg-[var(--neutral-4)]"
                        aria-label="展开阶段"
                      >
                        <ChevronDown
                          className={cn(
                            "w-icon-sm h-icon-sm transition-transform duration-300 ease-breathe",
                            isOpen && "rotate-180",
                          )}
                          strokeWidth={1.75}
                        />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 overflow-x-auto">
                        {p.stages.map((s) => {
                          const color = stageColor[s.status];
                          const isFailed = s.status === "failed";
                          return (
                            <div
                              key={s.id}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-3 py-2 ring-1 ring-border bg-neutral-1 dark:bg-[var(--neutral-1)] shrink-0",
                                isFailed && "ring-error/40",
                              )}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span
                                className={cn(
                                  "text-label-12 font-medium",
                                  isFailed
                                    ? "text-error"
                                    : "text-neutral-8 dark:text-[var(--neutral-8)]",
                                )}
                              >
                                {s.name}
                              </span>
                              <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums">
                                {formatDuration(s.durationMs)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}
