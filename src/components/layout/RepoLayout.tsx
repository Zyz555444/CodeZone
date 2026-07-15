import { useParams, NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Code2, CircleDot, GitPullRequest, MessagesSquare,
  BookOpen, Workflow, GitCommit, Star, ChevronRight,
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

export function RepoLayout() {
  const { repoId } = useParams();
  const location = useLocation();
  const [repo, setRepo] = useState<Repo | null>(null);

  useEffect(() => {
    if (repoId) api.getRepo(repoId).then(setRepo);
  }, [repoId]);

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
