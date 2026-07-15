import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Map, Plus, Calendar, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Milestone } from "@/lib/types";

const repoNames: Record<string, string> = {
  r1: "codezone-core",
  r2: "codezone-web",
  r3: "codezone-cli",
  r4: "design-tokens",
  r5: "codezone-docs",
};

export default function Milestones() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"board" | "roadmap">("board");

  useEffect(() => {
    fetch("/api/milestones")
      .then((r) => r.json())
      .then((json) => setMilestones(json.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="reveal flex items-start justify-between gap-4">
        <div>
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-1.5">路线规划</p>
          <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            里程碑与路线图
          </h1>
          <p className="mt-1.5 text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)]">
            团队的交付节奏与版本规划，一眼看清进度与截止。
          </p>
        </div>
        <Button variant="primary" size="md">
          <Plus className="w-icon-sm h-icon-sm" /> 新建里程碑
        </Button>
      </div>

      {/* 视图切换 */}
      <div className="flex gap-1 p-1 rounded-md bg-neutral-2 dark:bg-[var(--neutral-2)] w-fit reveal reveal-1">
        {(["board", "roadmap"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "px-3.5 py-1.5 rounded text-copy-14 font-medium transition-colors duration-300 ease-breathe",
              view === v
                ? "bg-paper text-neutral-10 dark:text-[var(--neutral-10)] ring-1 ring-border"
                : "text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-8 dark:hover:text-[var(--neutral-8)]",
            )}
          >
            {v === "board" ? "看板" : "路线图"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : view === "board" ? (
        <BoardView milestones={milestones} />
      ) : (
        <RoadmapView milestones={milestones} />
      )}
    </div>
  );
}

function BoardView({ milestones }: { milestones: Milestone[] }) {
  const now = Date.now();
  const day = 86400000;
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {milestones.map((m, i) => {
        const daysLeft = Math.ceil((m.dueDate - now) / day);
        const isOverdue = m.status === "open" && daysLeft < 0;
        const isNear = m.status === "open" && daysLeft >= 0 && daysLeft <= 3;
        return (
          <div key={m.id} className={`reveal reveal-${(i % 6) + 1} card flex flex-col`}>
            <div className="flex items-center justify-between mb-2">
              <Badge color={m.status === "open" ? "#33a6b8" : "#787670"} variant="soft">
                {m.status === "open" ? "进行中" : "已完成"}
              </Badge>
              <Link
                to={`/repos/${m.repoId}`}
                className="text-label-12 font-mono text-neutral-6 dark:text-[var(--neutral-6)] hover:text-[var(--color-accent)]"
              >
                {repoNames[m.repoId] ?? m.repoId}
              </Link>
            </div>

            <h3 className="font-serif text-title-20 font-medium text-neutral-10 dark:text-[var(--neutral-10)] mb-1.5">
              {m.title}
            </h3>
            <p className="text-copy-13 text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed mb-4 line-clamp-2">
              {m.description}
            </p>

            {/* 进度条 */}
            <div className="mt-auto">
              <div className="flex items-center justify-between text-label-12 mb-1.5">
                <span className="text-neutral-6 dark:text-[var(--neutral-6)]">
                  {m.closedIssues}/{m.totalIssues} 议题
                </span>
                <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)]">{m.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-neutral-3 dark:bg-[var(--neutral-3)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-700 ease-breathe"
                  style={{ width: `${m.progress}%` }}
                />
              </div>
              <div className={cn(
                "mt-3 flex items-center gap-1.5 text-label-12",
                isOverdue ? "text-error" : isNear ? "text-warning" : "text-neutral-5 dark:text-[var(--neutral-5)]",
              )}>
                {isOverdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                <span>
                  {m.status === "closed"
                    ? `完成于 ${formatDate(m.dueDate)}`
                    : isOverdue
                      ? `已逾期 ${Math.abs(daysLeft)} 天`
                      : `${formatDate(m.dueDate)} · 还剩 ${daysLeft} 天`}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoadmapView({ milestones }: { milestones: Milestone[] }) {
  const now = Date.now();
  const day = 86400000;
  // 6 个月时间轴
  const months: { label: string; ts: number }[] = [];
  const startMonth = new Date();
  startMonth.setDate(1);
  for (let i = 0; i < 6; i++) {
    const d = new Date(startMonth);
    d.setMonth(d.getMonth() + i);
    months.push({
      label: `${d.getMonth() + 1}月`,
      ts: d.getTime(),
    });
  }
  const spanStart = months[0].ts;
  const spanEnd = months[5].ts + 30 * day;
  const span = spanEnd - spanStart;
  const pct = (ts: number) => Math.max(0, Math.min(100, ((ts - spanStart) / span) * 100));

  return (
    <div className="card overflow-x-auto reveal">
      <div className="min-w-[640px]">
        {/* 月份刻度 */}
        <div className="flex border-b border-border pb-2 mb-3">
          <div className="w-32 shrink-0 text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
            里程碑
          </div>
          <div className="flex-1 relative h-4">
            {months.map((m) => (
              <span
                key={m.label}
                className="absolute text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] -translate-x-1/2"
                style={{ left: `${pct(m.ts)}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* 今天指示线 */}
        <div className="relative mb-3">
          <div className="w-32 shrink-0" />
          <div className="flex-1 relative h-full">
            <div
              className="absolute top-0 bottom-0 w-px bg-[var(--color-accent)] opacity-50"
              style={{ left: `${pct(now)}%` }}
            >
              <span className="absolute -top-0 -translate-y-full text-caption-10 text-[var(--color-accent)] whitespace-nowrap -translate-x-1/2">
                今天
              </span>
            </div>
          </div>
        </div>

        {/* 里程碑行 */}
        <div className="space-y-3">
          {milestones.map((m) => {
            const left = pct(now - 20 * day);
            const width = Math.max(4, pct(m.dueDate) - left);
            const barColor =
              m.status === "closed" ? "bg-success" : m.progress >= 80 ? "bg-[var(--color-accent)]" : "bg-neutral-5 dark:bg-[var(--neutral-5)]";
            return (
              <div key={m.id} className="flex items-center group">
                <div className="w-32 shrink-0 pr-3">
                  <p className="text-copy-13 font-medium text-neutral-9 dark:text-[var(--neutral-9)] truncate group-hover:text-[var(--color-accent)] transition-colors">
                    {m.title}
                  </p>
                  <p className="text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)]">{repoNames[m.repoId]}</p>
                </div>
                <div className="flex-1 relative h-7">
                  {/* 轨道 */}
                  <div className="absolute inset-y-2.5 inset-x-0 bg-neutral-2 dark:bg-[var(--neutral-2)] rounded-full" />
                  {/* 横条 */}
                  <div
                    className={cn("absolute inset-y-2 rounded-full flex items-center justify-end pr-2 transition-all duration-700 ease-breathe", barColor)}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <span className="text-caption-10 text-white font-mono">{m.progress}%</span>
                  </div>
                  {/* 截止圆点 */}
                  <div
                    className={cn(
                      "absolute top-1.5 w-3.5 h-3.5 rounded-full ring-2 ring-paper",
                      m.status === "closed" ? "bg-success" : "bg-[var(--color-accent)]",
                    )}
                    style={{ left: `calc(${pct(m.dueDate)}% - 7px)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-4 mt-5 pt-3 border-t border-border text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" /> 进行中</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" /> 已完成</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neutral-5 dark:bg-[var(--neutral-5)]" /> 规划中</span>
        </div>
      </div>
    </div>
  );
}
