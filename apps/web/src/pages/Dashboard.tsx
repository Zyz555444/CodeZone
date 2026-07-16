import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GitCommit, GitPullRequest, CircleDot, Workflow,
  ArrowUpRight, Sparkles, Plus, Github, BookOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Activity, DashboardStats, User, Repo } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useTitle } from "@/hooks/useTitle";
import { useAppStore } from "@/store/useAppStore";

const typeIcon = {
  commit: GitCommit,
  pull_request: GitPullRequest,
  issue: CircleDot,
  comment: Sparkles,
  pipeline: Workflow,
  merge: GitPullRequest,
};

interface NewRepoState {
  open: boolean;
  name: string;
  description: string;
  visibility: "public" | "private";
  loading: boolean;
  error: string;
}

const initialRepoState: NewRepoState = {
  open: false,
  name: "",
  description: "",
  visibility: "private",
  loading: false,
  error: "",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  useTitle("工作台 · CodeZone");
  const [activities, setActivities] = useState<(Activity & { actor: User; repo: Repo })[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRepo, setNewRepo] = useState<NewRepoState>(initialRepoState);

  const load = () => {
    setLoading(true);
    Promise.all([api.getActivities(12), api.getStats(), api.getRepos()])
      .then(([acts, s, r]) => {
        setActivities(acts);
        setStats(s);
        setRepos(r);
      })
      .catch(() => {
        setActivities([]); setStats(null); setRepos([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNewRepo = () => setNewRepo({ ...initialRepoState, open: true });
  const closeNewRepo = () => setNewRepo(initialRepoState);

  const submitNewRepo = async () => {
    setNewRepo((s) => ({ ...s, loading: true, error: "" }));
    try {
      const repo = await api.createRepo({
        name: newRepo.name,
        description: newRepo.description,
        visibility: newRepo.visibility,
      });
      closeNewRepo();
      navigate(`/repos/${repo.id}`);
    } catch (err) {
      setNewRepo((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : "创建失败" }));
    }
  };

  return (
    <div className="space-y-8">
      {/* 欢迎区 */}
      <section className="reveal flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-2">
            {greeting()}
          </p>
          <h2 className="font-serif text-display-36 font-medium text-neutral-10 dark:text-[var(--neutral-10)] leading-tight">
            {currentUser?.name}，今日有{" "}
            <span className="text-[var(--color-accent)]">{stats?.pendingReviews ?? 0}</span>{" "}
            项评审待处理
          </h2>
          <p className="mt-2 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] max-w-2xl">
            留白即专注。以下是团队最近的活动节奏,需要你关注的事项已置顶。
          </p>
        </div>
        <Button variant="primary" onClick={openNewRepo}>
          <Plus className="w-icon-sm h-icon-sm" /> 新建仓库
        </Button>
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
              to="/activity"
              className="text-label-12 text-[var(--color-accent)] hover:underline flex items-center gap-0.5"
            >
              查看全部 <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="relative pl-5">
              <div className="absolute left-[3px] top-2 bottom-2 w-px bg-border" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="mb-5">
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="card p-8 text-center space-y-3">
              <div className="grid place-items-center w-12 h-12 mx-auto rounded-full bg-[var(--color-accent-soft)]">
                <Sparkles className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="text-copy-15 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                  暂时还没有动态
                </h4>
                <p className="text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] mt-1">
                  创建第一个仓库或邀请同事,活动流会在这里出现。
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-1">
                <Button variant="primary" size="sm" onClick={openNewRepo}>
                  <Plus className="w-icon-sm h-icon-sm" /> 新建仓库
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate("/team")}>
                  邀请同事
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative pl-5">
              <div className="absolute left-[3px] top-2 bottom-2 w-px bg-border" />
              {activities.map((a, i) => {
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
          )}
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
                { label: "开放议题", value: stats?.openIssues ?? 0, to: "/issues" },
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                活跃仓库
              </h3>
              <Button variant="ghost" size="sm" onClick={openNewRepo}>
                <Plus className="w-icon-sm h-icon-sm" /> 新建
              </Button>
            </div>
            {repos.length === 0 ? (
              <div className="card p-5 text-center space-y-2">
                <BookOpen className="w-5 h-5 mx-auto text-[var(--color-accent)]" strokeWidth={1.75} />
                <p className="text-copy-13 text-neutral-7 dark:text-[var(--neutral-7)]">还没有仓库</p>
                <div className="flex flex-col gap-1.5 pt-1">
                  <Button variant="primary" size="sm" onClick={openNewRepo}>
                    从模板创建
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate("/repos")}>
                    <Github className="w-icon-sm h-icon-sm" /> 从 GitHub 导入
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {repos.slice(0, 5).map((r) => (
                  <Link
                    key={r.id}
                    to={`/repos/${r.id}`}
                    className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] transition-colors duration-300 ease-breathe"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.languageColor }} />
                    <span className="text-copy-13 font-mono text-neutral-8 dark:text-[var(--neutral-8)] truncate">{r.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 新建仓库弹窗 */}
      {newRepo.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4" onClick={closeNewRepo}>
          <div
            className="w-full max-w-md card p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-repo-title"
          >
            <h2 id="new-repo-title" className="font-serif text-title-20 text-neutral-10">新建仓库</h2>
            <div className="space-y-3">
              <label className="block text-copy-13 text-neutral-7">
                仓库名
                <input
                  autoFocus
                  type="text"
                  value={newRepo.name}
                  onChange={(e) => setNewRepo((s) => ({ ...s, name: e.target.value }))}
                  placeholder="my-project"
                  className="mt-1 w-full bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border rounded-md px-3 py-1.5 text-copy-13 focus:ring-[var(--color-accent)] focus:outline-none"
                />
              </label>
              <label className="block text-copy-13 text-neutral-7">
                描述
                <textarea
                  rows={2}
                  value={newRepo.description}
                  onChange={(e) => setNewRepo((s) => ({ ...s, description: e.target.value }))}
                  placeholder="一句话描述这个仓库的用途"
                  className="mt-1 w-full bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border rounded-md px-3 py-1.5 text-copy-13 focus:ring-[var(--color-accent)] focus:outline-none resize-none"
                />
              </label>
              <div className="flex items-center gap-2 text-copy-13 text-neutral-7">
                <span className="text-copy-13">可见性</span>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="visibility"
                    checked={newRepo.visibility === "private"}
                    onChange={() => setNewRepo((s) => ({ ...s, visibility: "private" }))}
                  />
                  私有
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="visibility"
                    checked={newRepo.visibility === "public"}
                    onChange={() => setNewRepo((s) => ({ ...s, visibility: "public" }))}
                  />
                  公开
                </label>
              </div>
            </div>
            {newRepo.error && <div className="text-copy-13 text-error">{newRepo.error}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeNewRepo}>取消</Button>
              <Button variant="primary" onClick={submitNewRepo} disabled={!newRepo.name || newRepo.loading}>
                {newRepo.loading ? "创建中…" : "创建"}
              </Button>
            </div>
          </div>
        </div>
      )}
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
