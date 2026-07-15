import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  GitCommit, GitPullRequest, GitMerge, CircleDot, Sparkles, Workflow,
  Star, Clock, MessageSquare, UserPlus, Mail,
} from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Activity, User, Repo, UserRole } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const roleStyle: Record<UserRole, { color: string; label: string }> = {
  member: { color: "#787670", label: "成员" },
  maintainer: { color: "var(--color-accent)", label: "维护者" },
  admin: { color: "#a64953", label: "管理员" },
};

const typeIcon: Record<Activity["type"], typeof GitCommit> = {
  commit: GitCommit,
  pull_request: GitPullRequest,
  issue: CircleDot,
  comment: Sparkles,
  pipeline: Workflow,
  merge: GitMerge,
};

// 基于日期生成稳定的伪随机活动数 (mock, day-of-year 做种子)
function activityCountForDate(d: Date): number {
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const abs = Math.abs(hash);
  const r = (abs % 1000) / 1000;
  if (r < 0.45) return 0;
  if (r < 0.7) return 1 + ((abs >> 3) % 2); // 1-2
  if (r < 0.88) return 3 + ((abs >> 5) % 3); // 3-5
  return 6 + ((abs >> 7) % 3); // 6-8
}

// 构建半年(26 周)的日期网格: 每列为一周, 7 行 = 周一至周日
function buildWeeks(weekCount: number): Date[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Monday
  const mondayOfCurrentWeek = new Date(today);
  mondayOfCurrentWeek.setDate(today.getDate() - dayOfWeek);
  const weeks: Date[][] = [];
  for (let w = weekCount - 1; w >= 0; w--) {
    const weekStart = new Date(mondayOfCurrentWeek);
    weekStart.setDate(mondayOfCurrentWeek.getDate() - w * 7);
    const days: Date[] = [];
    for (let dd = 0; dd < 7; dd++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + dd);
      days.push(day);
    }
    weeks.push(days);
  }
  return weeks;
}

const WEEKS = buildWeeks(26);
const DAY_LABELS = ["一", "", "三", "", "五", "", "日"];

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<(Activity & { actor: User; repo: Repo })[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setUser(null);
    Promise.all([api.getTeam(), api.getActivities(30), api.getRepos()])
      .then(([team, acts, allRepos]) => {
        const found = team.find((u) => u.id === userId) ?? null;
        if (!found) {
          setNotFound(true);
          return;
        }
        setUser(found);
        setActivities(acts.filter((a) => a.actorId === userId));
        setRepos(allRepos.filter((r) => r.ownerId === userId));
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const stats = useMemo(() => {
    const count = (t: Activity["type"]) => activities.filter((a) => a.type === t).length;
    return {
      commits: count("commit"),
      merges: count("merge"),
      issues: count("issue"),
      reviews: count("pull_request"),
    };
  }, [activities]);

  const recentActivities = useMemo(
    () => [...activities].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8),
    [activities],
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-32 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-52 rounded-lg" />
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="reveal py-24 text-center">
        <p className="font-serif text-title-24 font-medium text-neutral-8 dark:text-[var(--neutral-8)]">
          用户不存在
        </p>
        <p className="mt-2 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
          该用户可能已离开团队或链接有误
        </p>
        <Link
          to="/team"
          className="mt-6 inline-block text-copy-14 text-[var(--color-accent)] hover:underline"
        >
          返回团队列表
        </Link>
      </div>
    );
  }

  const role = roleStyle[user.role];

  return (
    <div className="space-y-8">
      {/* 顶部横幅 */}
      <section className="reveal card">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <Avatar user={user} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
                {user.name}
              </h1>
              <Badge color={role.color} variant="soft">
                {role.label}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)]">
              <span className="flex items-center gap-1.5 font-mono">
                <Mail className="w-3.5 h-3.5" strokeWidth={1.75} />
                {user.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                加入于 {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md">
              <UserPlus className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
              关注
            </Button>
            <Button variant="secondary" size="md">
              <MessageSquare className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
              消息
            </Button>
          </div>
        </div>
      </section>

      {/* 统计行 */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "提交", value: stats.commits, icon: GitCommit },
          { label: "合并", value: stats.merges, icon: GitMerge },
          { label: "议题", value: stats.issues, icon: CircleDot },
          { label: "评审", value: stats.reviews, icon: GitPullRequest },
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
                <Icon
                  className="w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]"
                  strokeWidth={1.75}
                />
              </div>
              <span className="font-serif text-display-36 font-medium text-neutral-10 dark:text-[var(--neutral-10)] tabular-nums">
                {s.value}
              </span>
            </div>
          );
        })}
      </section>

      {/* 贡献热力图 */}
      <section className="reveal reveal-1 card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
            贡献活动
          </h2>
          <div className="flex items-center gap-2 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
            <span>少</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-neutral-3 dark:bg-[var(--neutral-3)]" />
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-accent)] opacity-30" />
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-accent)] opacity-60" />
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-accent)]" />
            </div>
            <span>多</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* 月份标签 */}
            <div className="flex gap-[3px] mb-1 ml-6 h-3 text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)]">
              {WEEKS.map((week, i) => {
                const prevMonth = i > 0 ? WEEKS[i - 1][0].getMonth() : -1;
                const month = week[0].getMonth();
                return (
                  <div key={i} className="w-2.5 whitespace-nowrap overflow-visible">
                    {month !== prevMonth ? `${month + 1}月` : ""}
                  </div>
                );
              })}
            </div>
            {/* 热力图主体 */}
            <div className="flex">
              {/* 周几标签 */}
              <div className="flex flex-col gap-[3px] mr-2">
                {DAY_LABELS.map((d, i) => (
                  <span
                    key={i}
                    className="h-2.5 leading-[10px] w-4 text-right text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)] whitespace-nowrap"
                  >
                    {d}
                  </span>
                ))}
              </div>
              {/* 方格网格 */}
              <div
                className="grid grid-flow-col gap-[3px]"
                style={{ gridTemplateRows: "repeat(7, 10px)" }}
              >
                {WEEKS.flat().map((date, i) => {
                  const count = activityCountForDate(date);
                  const isFuture = date.getTime() > Date.now();
                  const bg = isFuture
                    ? "bg-transparent"
                    : count === 0
                      ? "bg-neutral-3 dark:bg-[var(--neutral-3)]"
                      : count <= 2
                        ? "bg-[var(--color-accent)] opacity-30"
                        : count <= 5
                          ? "bg-[var(--color-accent)] opacity-60"
                          : "bg-[var(--color-accent)]";
                  return (
                    <div
                      key={i}
                      className={cn("w-2.5 h-2.5 rounded-sm", bg)}
                      title={`${formatDate(date.getTime())} · ${count} 次活动`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 最近活动 */}
        <section className="lg:col-span-2">
          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4">
            最近活动
          </h2>
          <div className="space-y-2.5">
            {recentActivities.length === 0 ? (
              <div className="card text-center py-12 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
                暂无活动记录
              </div>
            ) : (
              recentActivities.map((a, i) => {
                const Icon = typeIcon[a.type] ?? Sparkles;
                return (
                  <div
                    key={a.id}
                    className={`reveal reveal-${(i % 6) + 1} card hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe`}
                  >
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
                );
              })
            )}
          </div>
        </section>

        {/* 置顶仓库 */}
        <aside>
          <h2 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-4">
            置顶仓库
          </h2>
          <div className="space-y-3">
            {repos.length === 0 ? (
              <div className="card text-center py-12 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
                暂无拥有的仓库
              </div>
            ) : (
              repos.map((repo, i) => (
                <Link
                  key={repo.id}
                  to={`/repos/${repo.id}`}
                  className={`reveal reveal-${(i % 6) + 1} card block hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe`}
                >
                  <h3 className="font-mono text-copy-15 text-neutral-10 dark:text-[var(--neutral-10)] hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe">
                    {repo.name}
                  </h3>
                  <p className="mt-1.5 text-copy-13 text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed line-clamp-2">
                    {repo.description}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: repo.languageColor }}
                      />
                      {repo.language}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" strokeWidth={1.75} />
                      {repo.stars}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
