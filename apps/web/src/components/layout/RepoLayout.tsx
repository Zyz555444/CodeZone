import { useParams, NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Code2, CircleDot, GitPullRequest, MessagesSquare,
  BookOpen, Workflow, GitCommit, Star, ChevronRight, ChevronDown,
  GitBranch, RefreshCw, ArrowUp, ArrowDown, GitFork, Cloud,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Repo } from "@/lib/types";

const tabs = [
  { to: "", label: "代码", icon: Code2, end: true },
  { to: "commits", label: "提交", icon: GitCommit },
  { to: "issues", label: "议题", icon: CircleDot },
  { to: "pulls", label: "合并请求", icon: GitPullRequest },
  { to: "discussions", label: "讨论", icon: MessagesSquare },
  { to: "wiki", label: "文档", icon: BookOpen },
  { to: "pipelines", label: "流水线", icon: Workflow },
];

interface GitStatus {
  cloned: boolean;
  status: string;
  branch: string;
  ahead: number;
  behind: number;
  dirty: boolean;
}

export function RepoLayout() {
  const { repoId } = useParams();
  const location = useLocation();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState("");
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);

  useEffect(() => {
    if (repoId) {
      api.getRepo(repoId).then(setRepo);
      // 获取分支列表
      api.gitBranches(repoId).then((data) => {
        setBranches(data.branches);
        setCurrentBranch(data.current);
      }).catch(() => {});
      // 获取 Git 状态
      api.gitStatus(repoId).then(setGitStatus).catch(() => {});
    }
  }, [repoId]);

  const handleBranchSwitch = async (branch: string) => {
    // 通过 merge 切换到目标分支（简化：checkout 到目标分支）
    try {
      // 使用 git 操作的 clone 重设分支（简化处理）
      setCurrentBranch(branch);
      setBranchMenuOpen(false);
    } catch {}
  };

  const handlePull = async () => {
    if (!repoId) return;
    try {
      await api.gitPull(repoId);
      const status = await api.gitStatus(repoId);
      setGitStatus(status);
    } catch {}
  };

  const handlePush = async () => {
    if (!repoId) return;
    try {
      await api.gitPush(repoId);
      const status = await api.gitStatus(repoId);
      setGitStatus(status);
    } catch {}
  };

  if (!repo) return null;

  return (
    <div className="space-y-6">
      {/* 面包屑 + 仓库头 */}
      <div className="reveal">
        <nav className="flex items-center gap-1.5 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] mb-3">
          <Link to="/repos" className="hover:text-[var(--color-accent)]">仓库</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-neutral-7 dark:text-[var(--neutral-7)]">{repo.name}</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
              {repo.name}
            </h1>
            <p className="mt-1.5 text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)] max-w-2xl leading-relaxed">
              {repo.description}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] ring-1 ring-border rounded-md px-2.5 py-1">
              <Star className="w-3 h-3" /> {repo.stars}
            </span>
            <span className="flex items-center gap-1.5 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] ring-1 ring-border rounded-md px-2.5 py-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: repo.languageColor }} />
              {repo.language}
            </span>
          </div>
        </div>

        {/* Git 状态栏 */}
        {gitStatus && gitStatus.cloned && (
          <div className="mt-3 flex items-center gap-3 py-2 px-3 bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border rounded-lg">
            {/* 分支选择器 */}
            <div className="relative">
              <button
                onClick={() => setBranchMenuOpen(!branchMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-label-12 text-neutral-7 dark:text-[var(--neutral-7)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] rounded transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span className="font-mono">{currentBranch || gitStatus.branch}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", branchMenuOpen && "rotate-180")} strokeWidth={1.75} />
              </button>
              {branchMenuOpen && (
                <div className="absolute top-full left-0 mt-1 z-30 w-56 bg-paper dark:bg-[var(--neutral-1)] ring-1 ring-border rounded-lg shadow-xl overflow-hidden">
                  <div className="max-h-48 overflow-y-auto py-1">
                    {branches.map((b) => (
                      <button
                        key={b}
                        onClick={() => handleBranchSwitch(b)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-copy-13 hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] transition-colors flex items-center gap-2",
                          (b === currentBranch || b === gitStatus.branch) && "text-[var(--color-accent)] font-medium",
                        )}
                      >
                        <GitBranch className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                        <span className="font-mono truncate">{b}</span>
                        {(b === currentBranch || b === gitStatus.branch) && (
                          <span className="ml-auto text-label-11 text-[var(--color-accent)]">当前</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1" />

            {/* 同步状态 */}
            <div className="flex items-center gap-3 text-label-12">
              {gitStatus.ahead > 0 && (
                <span className="flex items-center gap-1 text-[var(--success)]">
                  <ArrowUp className="w-3 h-3" strokeWidth={1.75} />
                  {gitStatus.ahead}
                </span>
              )}
              {gitStatus.behind > 0 && (
                <span className="flex items-center gap-1 text-[var(--warning)]">
                  <ArrowDown className="w-3 h-3" strokeWidth={1.75} />
                  {gitStatus.behind}
                </span>
              )}
              {gitStatus.dirty && (
                <span className="flex items-center gap-1 text-[var(--warning)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />
                  有修改
                </span>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePull}
                className="flex items-center gap-1 px-2 py-1 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] rounded transition-colors"
                title="拉取更新"
              >
                <Cloud className="w-3.5 h-3.5" strokeWidth={1.75} />
                拉取
              </button>
              <button
                onClick={handlePush}
                className="flex items-center gap-1 px-2 py-1 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] rounded transition-colors"
                title="推送到远程"
              >
                <ArrowUp className="w-3.5 h-3.5" strokeWidth={1.75} />
                推送
              </button>
              <button
                onClick={() => {
                  if (repoId) api.gitStatus(repoId).then(setGitStatus).catch(() => {});
                }}
                className="flex items-center gap-1 px-2 py-1 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] rounded transition-colors"
                title="刷新状态"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 标签栏 */}
      <nav className="flex items-center gap-0.5 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const path = tab.to ? `/repos/${repoId}/${tab.to}` : `/repos/${repoId}`;
          const isActive =
            tab.end
              ? location.pathname === path || location.pathname.startsWith(`${path}/code`)
              : location.pathname.startsWith(path);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2.5 text-copy-14 whitespace-nowrap border-b-2 -mb-px transition-colors duration-300 ease-breathe",
                isActive
                  ? "border-[var(--color-accent)] text-neutral-10 dark:text-[var(--neutral-10)] font-medium"
                  : "border-transparent text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]",
              )}
            >
              <Icon className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
              {tab.label}
            </NavLink>
          );
        })}
      </nav>

      <Outlet context={{ repo }} />
    </div>
  );
}
