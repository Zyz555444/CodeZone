import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, RotateCcw, X, GitBranch } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime, formatDuration, shortSha } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Pipeline } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusDot } from "@/components/ui/StatusDot";

export default function PipelineDetail() {
  const { runId } = useParams();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    api
      .getPipeline(runId)
      .then(setPipeline)
      .finally(() => setLoading(false));
  }, [runId]);

  const handleRetry = async () => {
    if (acting || !runId) return;
    setActing(true);
    setActionError(null);
    try {
      const updated = await api.retryPipeline(runId);
      setPipeline(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "重试失败");
    } finally {
      setActing(false);
    }
  };

  const handleCancel = async () => {
    if (acting || !runId) return;
    setActing(true);
    setActionError(null);
    try {
      const updated = await api.cancelPipeline(runId);
      setPipeline(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "取消失败");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40 rounded" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="card text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)]">
        未找到该流水线运行
      </div>
    );
  }

  const isRunning = pipeline.status === "running";

  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <nav className="reveal flex items-center gap-1.5 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
        <Link
          to="/pipelines"
          className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe"
        >
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          流水线
        </Link>
      </nav>

      {/* 标题 */}
      <div className="reveal reveal-1">
        <h1 className="font-serif text-title-24 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          {pipeline.commitMessage}
        </h1>
        <div className="mt-2">
          <StatusDot status={pipeline.status} label pulse={isRunning} />
        </div>
      </div>

      {/* 摘要条 */}
      <div className="reveal reveal-2 card flex flex-wrap items-center gap-3 text-copy-13 text-neutral-7 dark:text-[var(--neutral-7)]">
        <span className="font-mono text-neutral-9 dark:text-[var(--neutral-9)]">
          {shortSha(pipeline.commitSha)}
        </span>
        <span className="text-neutral-4 dark:text-[var(--neutral-4)]">·</span>
        <span className="flex items-center gap-1 font-mono">
          <GitBranch className="w-3 h-3" strokeWidth={1.75} />
          {pipeline.branch}
        </span>
        <span className="text-neutral-4 dark:text-[var(--neutral-4)]">·</span>
        <Badge variant="outline">{pipeline.trigger}</Badge>
        <span className="text-neutral-4 dark:text-[var(--neutral-4)]">·</span>
        <span className="tabular-nums">{formatDuration(pipeline.durationMs)}</span>
        <span className="text-neutral-4 dark:text-[var(--neutral-4)]">·</span>
        <span>{relativeTime(pipeline.createdAt)}</span>
      </div>

      {/* 阶段步骤条 */}
      <div className="reveal reveal-3">
        <h3 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-3">
          阶段
        </h3>
        <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
          {pipeline.stages.map((s) => {
            const isActive = expandedStage === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setExpandedStage(isActive ? null : s.id)}
                className={cn(
                  "shrink-0 w-48 text-left rounded-lg p-3 ring-1 transition-colors duration-300 ease-breathe",
                  isActive
                    ? "ring-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                    : "ring-border bg-neutral-2 dark:bg-[var(--neutral-2)] hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)]",
                )}
              >
                <span className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)] block truncate">
                  {s.name}
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <StatusDot status={s.status} label />
                  <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] tabular-nums">
                    {formatDuration(s.durationMs)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {expandedStage && (
          <pre className="mt-3 font-mono text-copy-13 bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border rounded-md p-4 overflow-x-auto whitespace-pre-wrap">
            {pipeline.stages.find((s) => s.id === expandedStage)?.log}
          </pre>
        )}
      </div>

      {/* 底部操作 */}
      {actionError && (
        <p className="reveal reveal-4 text-label-12 text-error">{actionError}</p>
      )}
      <div className="reveal reveal-4 flex items-center gap-2">
        {!isRunning && (
          <Button variant="primary" size="md" onClick={handleRetry} disabled={acting}>
            <RotateCcw className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
            {acting ? "处理中…" : "重新运行"}
          </Button>
        )}
        {isRunning && (
          <Button variant="danger" size="md" onClick={handleCancel} disabled={acting}>
            <X className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
            {acting ? "处理中…" : "取消"}
          </Button>
        )}
      </div>
    </div>
  );
}
