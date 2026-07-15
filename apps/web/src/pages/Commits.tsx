import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { GitGraph, List, RefreshCw, Github, Plus, Minus } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime, shortSha, formatDate } from "@/lib/format";
import type { Commit, Repo, User } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

interface RepoContext {
  repo: Repo;
}

export default function Commits() {
  const { repo } = useOutletContext<RepoContext>();
  const [commits, setCommits] = useState<Commit[]>([]);
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "graph">("list");
  const [graphLog, setGraphLog] = useState("");
  const [graphLoading, setGraphLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    Promise.all([api.getCommits(repo.id), api.getTeam()])
      .then(([c, team]) => {
        setCommits(c);
        const map = new Map<string, User>();
        team.forEach((u) => map.set(u.id, u));
        setUserMap(map);
      })
      .finally(() => setLoading(false));
  }, [repo.id]);

  useEffect(() => {
    if (viewMode !== "graph") return;
    setGraphLoading(true);
    api
      .gitGraph(repo.id, 30)
      .then(({ log }) => setGraphLog(log))
      .finally(() => setGraphLoading(false));
  }, [repo.id, viewMode]);

  const handleRefresh = () => {
    setLoading(true);
    Promise.all([api.getCommits(repo.id), api.getTeam()])
      .then(([c, team]) => {
        setCommits(c);
        const map = new Map<string, User>();
        team.forEach((u) => map.set(u.id, u));
        setUserMap(map);
      })
      .finally(() => setLoading(false));
  };

  const handleSync = () => {
    setSyncing(true);
    api
      .githubSyncCommits(repo.id)
      .then(() => handleRefresh())
      .finally(() => setSyncing(false));
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Commit[]>();
    for (const c of commits) {
      const key = formatDate(c.createdAt);
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [commits]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 reveal">
      {/* 工具栏 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-md ring-1 ring-border overflow-hidden">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-label-12 transition-colors duration-300 ease-breathe ${
              viewMode === "list"
                ? "bg-neutral-2 dark:bg-[var(--neutral-2)] text-neutral-9 dark:text-[var(--neutral-9)] font-medium"
                : "text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]"
            }`}
          >
            <List className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
            列表
          </button>
          <button
            onClick={() => setViewMode("graph")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-label-12 transition-colors duration-300 ease-breathe ${
              viewMode === "graph"
                ? "bg-neutral-2 dark:bg-[var(--neutral-2)] text-neutral-9 dark:text-[var(--neutral-9)] font-medium"
                : "text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]"
            }`}
          >
            <GitGraph className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
            图谱
          </button>
        </div>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
        >
          <Github className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
          {syncing ? "同步中…" : "同步"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
        </Button>
      </div>

      {/* 图谱视图 */}
      {viewMode === "graph" && (
        <div className="card p-0 overflow-hidden">
          {graphLoading ? (
            <div className="p-4">
              <Skeleton className="h-72 rounded-lg" />
            </div>
          ) : (
            <pre className="p-4 font-mono text-copy-13 text-neutral-8 dark:text-[var(--neutral-8)] leading-relaxed overflow-x-auto whitespace-pre">
              {graphLog || "暂无图谱数据"}
            </pre>
          )}
        </div>
      )}

      {/* 列表视图 */}
      {viewMode === "list" && (
        <div className="card p-0 overflow-hidden">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <div className="px-4 pt-4 pb-1 text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
                {date}
              </div>
              {items.map((commit) => {
                const author = userMap.get(commit.authorId);
                return (
                  <div
                    key={commit.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe"
                  >
                    <div className="flex items-center gap-2.5 shrink-0 w-40">
                      {author && <Avatar user={author} size="sm" />}
                      <span className="text-copy-13 text-neutral-8 dark:text-[var(--neutral-8)] truncate">
                        {author?.name ?? commit.authorId}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] truncate">
                        {commit.message}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                        <span className="font-mono">{shortSha(commit.sha)}</span>
                        <span>·</span>
                        <span>{relativeTime(commit.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-label-12 shrink-0">
                      <span className="flex items-center gap-0.5 text-[var(--success)]">
                        <Plus className="w-3 h-3" strokeWidth={1.75} />
                        {commit.additions}
                      </span>
                      <span className="flex items-center gap-0.5 text-[var(--error)]">
                        <Minus className="w-3 h-3" strokeWidth={1.75} />
                        {commit.deletions}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
