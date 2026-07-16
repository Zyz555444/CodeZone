import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Map, Plus, Calendar, CheckCircle2, Circle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import type { Milestone, Repo } from "@/lib/types";

export default function Milestones() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [repoMap, setRepoMap] = useState<Record<string, Repo>>({});
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"board" | "roadmap">("board");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ repoId: "", title: "", description: "", dueDate: "" });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    Promise.all([api.getMilestones(), api.getRepos()])
      .then(([list, repos]) => {
        setMilestones(list);
        setRepos(repos);
        const map: Record<string, Repo> = {};
        repos.forEach((r) => (map[r.id] = r));
        setRepoMap(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const openModal = () => {
    setForm({
      repoId: repos[0]?.id ?? "",
      title: "",
      description: "",
      dueDate: "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.repoId || !form.title || !form.dueDate) {
      setFormError("请填写仓库、标题与截止日期");
      return;
    }
    setSaving(true);
    try {
      const due = new Date(form.dueDate).getTime();
      const created = await api.createMilestone({
        repoId: form.repoId,
        title: form.title,
        description: form.description,
        dueDate: due,
      });
      setMilestones((prev) => [...prev, created]);
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

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
        <Button variant="primary" size="md" onClick={openModal}>
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
        <BoardView milestones={milestones} repoMap={repoMap} />
      ) : (
        <RoadmapView milestones={milestones} repoMap={repoMap} />
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setModalOpen(false)}
        >
          <div className="absolute inset-0 bg-neutral-10/30 dark:bg-black/50 backdrop-blur-thin" />
          <div
            className="relative w-full max-w-md bg-paper rounded-xl ring-1 ring-border shadow-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-title-20 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
                新建里程碑
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="grid place-items-center w-8 h-8 rounded-md text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)]"
                aria-label="关闭"
              >
                <X className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
              </button>
            </div>
            {formError && (
              <div className="mb-4 flex items-start gap-2 p-3 rounded-md bg-error/10 text-error text-copy-13">
                <AlertCircle className="w-icon-sm h-icon-sm shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>{formError}</span>
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label htmlFor="milestone-repo" className="block text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] mb-1">
                  所属仓库
                </label>
                <select
                  id="milestone-repo"
                  value={form.repoId}
                  onChange={(e) => setForm({ ...form, repoId: e.target.value })}
                  className="w-full bg-neutral-2 dark:bg-[var(--neutral-2)] ring-1 ring-border rounded-md px-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                >
                  {repos.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="milestone-title" className="block text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] mb-1">
                  标题
                </label>
                <input
                  id="milestone-title"
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-neutral-2 dark:bg-[var(--neutral-2)] ring-1 ring-border rounded-md px-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="例如：v1.0 发布"
                />
              </div>
              <div>
                <label htmlFor="milestone-desc" className="block text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] mb-1">
                  描述
                </label>
                <textarea
                  id="milestone-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-neutral-2 dark:bg-[var(--neutral-2)] ring-1 ring-border rounded-md px-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] outline-none focus:ring-2 focus:ring-[var(--color-accent)] min-h-[80px]"
                  placeholder="描述该里程碑的目标与范围"
                />
              </div>
              <div>
                <label htmlFor="milestone-due" className="block text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] mb-1">
                  截止日期
                </label>
                <input
                  id="milestone-due"
                  type="date"
                  required
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full bg-neutral-2 dark:bg-[var(--neutral-2)] ring-1 ring-border rounded-md px-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <Button type="button" variant="secondary" size="md" className="flex-1" onClick={() => setModalOpen(false)}>
                  取消
                </Button>
                <Button type="submit" variant="primary" size="md" className="flex-1" disabled={saving}>
                  {saving ? "保存中…" : "创建"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BoardView({ milestones, repoMap }: { milestones: Milestone[]; repoMap: Record<string, Repo> }) {
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
                {repoMap[m.repoId]?.name ?? m.repoId}
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

function RoadmapView({ milestones, repoMap }: { milestones: Milestone[]; repoMap: Record<string, Repo> }) {
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
                  <p className="text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)]">{repoMap[m.repoId]?.name ?? m.repoId}</p>
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
