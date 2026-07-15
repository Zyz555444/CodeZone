import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  GitCommit, GitPullRequest, CircleDot, Workflow,
  ArrowUpRight, Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Activity, DashboardStats, User, Repo } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAppStore } from "@/store/useAppStore";

const typeIcon = {
  commit: GitCommit,
  pull_request: GitPullRequest,
  issue: CircleDot,
  comment: Sparkles,
  pipeline: Workflow,
  merge: GitPullRequest,
};

export default function Dashboard() {
  const { currentUser } = useAppStore();
  const [activities, setActivities] = useState<(Activity & { actor: User; repo: Repo })[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getActivities(12), api.getStats()])
      .then(([acts, s]) => {
        setActivities(acts);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* 欢迎区 */}
      <section className="reveal">
        <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-2">
          {greeting()}
        </p>
        <h2 className="font-serif text-display-36 font-medium text-neutral-10 dark:text-[var(--neutral-10)] leading-tight">
          {currentUser?.name}，今日有{" "}
          <span className="text-[var(--color-accent)]">{stats?.pendingReviews ?? 0}</span>{" "}
          项评审待处理
        </h2>
        <p className="mt-2 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] max-w-2xl">
          留白即专注。以下是团队最近的活动节奏，需要你关注的事项已置顶。
        </p>
      </section>

      {/* 统计卡片 */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))
          : stats &&
            [
              { label: "本周提交", value: stats.weeklyCommits, icon: GitCommit },
              { label: "本周合并", value: stats.weeklyMerges, icon: GitPullRequest },
              { label: "待评审", value: stats.pendingReviews, icon: CircleDot },
              { label: "流水线通过率", value: `${stats.pipelinePassRate}%`, icon: Workflow },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className={`reveal reveal-${i + 1} card flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-label-12 text-neutral-6 dark:text-[var(--neutral-6)]">
                      {s.label}
                    </span>
                    <Icon className="w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
                  </div>
                  <span className="font-serif text-display-36 font-medium text-neutral-10 dark:text-[var(--neutral-10)] tabular-nums">
                    {s.value}
                  </span>
                </div>
              );
            })}
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 活动流 */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
              活动流
            </h3>
            <Link
              to="/pulls"
              className="text-label-12 text-[var(--color-accent)] hover:underline flex items-center gap-0.5"
            >
              查看全部 <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="relative pl-5">
            {/* 时间轴线 */}
            <div className="absolute left-[3px] top-2 bottom-2 w-px bg-border" />

            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="mb-5">
                    <Skeleton className="h-16 w-full rounded-lg" />
                  </div>
                ))
              : activities.map((a, i) => {
                  const Icon = typeIcon[a.type] ?? Sparkles;
                  return (
                    <div
                      key={a.id}
                      className={`reveal reveal-${(i % 6) + 1} relative mb-5`}
                    >
                      <span className="absolute -left-5 top-3 grid place-items-center w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] ring-4 ring-paper" />
                      <div className="card hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe">
                        <div className="flex items-start gap-3">
                          <Avatar user={a.actor} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-copy-14 text-neutral-8 dark:text-[var(--neutral-8)] leading-relaxed">
                              <span className="font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
                                {a.actor.name}
                              </span>{" "}
                              {a.description}
                            </p>
                            <div className="mt-1 flex items-center gap-3 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                              <span className="flex items-center gap-1">
                                <Icon className="w-3 h-3" strokeWidth={1.75} />
                                {a.repo.name}
                              </span>
                              <span>·</span>
                              <span>{relativeTime(a.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </section>

        {/* 待办侧栏 */}
        <aside className="space-y-6">
          <div>
            <h3 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4">
              待你处理
            </h3>
            <div className="space-y-2.5">
              {[
                { label: "待评审 PR", value: stats?.pendingReviews ?? 0, to: "/pulls", accent: true },
                { label: "指派给我的议题", value: 3, to: "/issues" },
                { label: "@提及", value: 5, to: "/discussions" },
                { label: "失败流水线", value: 1, to: "/pipelines" },
              ].map((t) => (
                <Link
                  key={t.label}
                  to={t.to}
                  className="flex items-center justify-between rounded-lg px-4 py-3 ring-1 ring-border bg-neutral-2 dark:bg-[var(--neutral-2)] hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe"
                >
                  <span className="text-copy-14 text-neutral-7 dark:text-[var(--neutral-7)]">
                    {t.label}
                  </span>
                  <span
                    className={`font-serif text-title-20 font-medium tabular-nums ${
                      t.accent ? "text-[var(--color-accent)]" : "text-neutral-9 dark:text-[var(--neutral-9)]"
                    }`}
                  >
                    {t.value}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4">
              活跃仓库
            </h3>
            <div className="space-y-1">
              {["codezone-core", "codezone-web", "codezone-cli", "design-tokens"].map((r, i) => (
                <Link
                  key={r}
                  to={`/repos/r${i + 1}`}
                  className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] transition-colors duration-300 ease-breathe"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ["#3178c6", "#3178c6", "#00ADD8", "#563d7c"][i] }} />
                  <span className="text-copy-13 font-mono text-neutral-8 dark:text-[var(--neutral-8)]">{r}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "深夜了";
  if (h < 12) return "早安";
  if (h < 18) return "午后好";
  return "晚上好";
}
