import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Star, CircleDot, GitPullRequest, Clock, Github, Download, RefreshCw, GitFork } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Repo } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

export default function ReposList() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const fetchRepos = () => {
    setLoading(true);
    api.getRepos().then((list) => {
      setRepos(list);
      fetchGitStatuses(list);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => r.name.toLowerCase().includes(q));
  }, [repos, query]);

  // GitHub 导入
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [githubRepos, setGithubRepos] = useState<{ id: number; name: string; fullName: string; description: string; language: string; stars: number; defaultBranch: string; private: boolean; updatedAt: number; cloneUrl: string; htmlUrl: string }[]>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  const openGitHubModal = async () => {
    setShowGitHubModal(true);
    setGithubLoading(true);
    try {
      const result = await api.githubConnected();
      setGithubConnected(result.connected);
      setGithubUsername(result.githubUsername);
      if (result.connected) {
        const repos = await api.githubRepos();
        setGithubRepos(repos);
      }
    } catch {
      setGithubConnected(false);
    } finally {
      setGithubLoading(false);
    }
  };

  const handleImport = async (fullName: string) => {
    setImporting(fullName);
    try {
      await api.githubImport(fullName);
      setShowGitHubModal(false);
      fetchRepos();
    } catch {
      // 导入失败
    } finally {
      setImporting(null);
    }
  };

  // 快速克隆
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneUrl, setCloneUrl] = useState("");
  const [cloneRepoId, setCloneRepoId] = useState<string | null>(null);
  const [cloneRepoName, setCloneRepoName] = useState<string | null>(null);
  const [cloneLoading, setCloneLoading] = useState(false);

  // Git 状态缓存
  const [gitStatuses, setGitStatuses] = useState<Record<string, { cloned: boolean }>>({});

  const fetchGitStatuses = (repoList: Repo[]) => {
    Promise.allSettled(
      repoList.map((r) =>
        api.gitStatus(r.id).then((s) => ({ id: r.id, cloned: s.cloned }))
      )
    ).then((results) => {
      const map: Record<string, { cloned: boolean }> = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          map[r.value.id] = { cloned: r.value.cloned };
        }
      });
      setGitStatuses(map);
    });
  };

  const openCloneModal = (repo?: Repo) => {
    if (repo) {
      setCloneRepoId(repo.id);
      setCloneRepoName(repo.name);
    } else {
      setCloneRepoId(null);
      setCloneRepoName(null);
    }
    setCloneUrl("");
    setShowCloneModal(true);
  };

  const handleClone = async () => {
    if (!cloneUrl.trim() || !cloneRepoId) return;
    setCloneLoading(true);
    try {
      await api.gitClone(cloneRepoId, cloneUrl.trim());
      setShowCloneModal(false);
      fetchGitStatuses(repos);
    } catch {
      // 克隆失败
    } finally {
      setCloneLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <section className="reveal">
        <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          仓库
        </h1>
        <p className="mt-1.5 text-copy-15 text-neutral-6 dark:text-[var(--neutral-6)] max-w-2xl leading-relaxed">
          所有协作中的代码库。留白之间，是团队呼吸的节奏。
        </p>
      </section>

      {/* 搜索 */}
      <section className="reveal reveal-1 flex items-center gap-3 flex-wrap">
        <div className="relative max-w-md flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索仓库名…"
            className="w-full rounded-md bg-neutral-2 dark:bg-[var(--neutral-2)] ring-1 ring-border pl-9 pr-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] placeholder:text-neutral-5 dark:placeholder:text-[var(--neutral-5)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-shadow duration-300 ease-breathe"
          />
        </div>
        <Button variant="secondary" size="md" onClick={openGitHubModal}>
          <Download className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
          从 GitHub 导入
        </Button>
        <Button variant="secondary" size="md" onClick={() => openCloneModal()}>
          <GitFork className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
          快速克隆
        </Button>
        <Button variant="secondary" size="md" onClick={() => window.location.href = "/api/auth/github"}>
          <Github className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
          连接 GitHub
        </Button>
      </section>

      {/* 仓库卡片网格 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))
          : filtered.map((repo, i) => {
              const status = gitStatuses[repo.id];
              return (
              <Link
                key={repo.id}
                to={`/repos/${repo.id}`}
                className={`group reveal reveal-${(i % 6) + 1} card flex flex-col hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-mono text-copy-16 text-neutral-10 dark:text-[var(--neutral-10)] group-hover:text-[var(--color-accent)] transition-colors duration-300 ease-breathe truncate">
                    {repo.name}
                  </h3>
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      status?.cloned
                        ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
                        : "bg-neutral-4 dark:bg-neutral-6"
                    }`}
                    title={status?.cloned ? "已克隆" : "未克隆"}
                  />
                </div>
                <p className="mt-2 flex-1 text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed line-clamp-2">
                  {repo.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
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
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" strokeWidth={1.75} />
                    {relativeTime(repo.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CircleDot className="w-3 h-3" strokeWidth={1.75} />
                    {repo.openIssues}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitPullRequest className="w-3 h-3" strokeWidth={1.75} />
                    {repo.openPRs}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openCloneModal(repo); }}
                  className="mt-3 self-end flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] hover:text-[var(--color-accent)]"
                >
                  <GitFork className="w-3 h-3" strokeWidth={1.75} />
                  克隆
                </button>
              </Link>
              );
            })}
      </section>

      {!loading && filtered.length === 0 && (
        <div className="reveal text-center py-16 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
          未找到匹配的仓库
        </div>
      )}

      {/* GitHub 导入弹窗 */}
      {showGitHubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowGitHubModal(false)}>
          <div className="bg-paper dark:bg-[var(--neutral-1)] rounded-xl ring-1 ring-border shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-serif text-title-18 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
                从 GitHub 导入仓库
              </h3>
              <button
                onClick={() => setShowGitHubModal(false)}
                className="grid place-items-center w-8 h-8 rounded-md text-neutral-5 dark:text-[var(--neutral-5)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] transition-colors"
              >
                <span className="text-copy-16 leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-4rem)]">
              {githubLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-icon-md h-icon-md text-neutral-5 animate-spin" strokeWidth={1.75} />
                </div>
              ) : !githubConnected ? (
                <div className="text-center py-8 space-y-4">
                  <Github className="w-icon-lg h-icon-lg text-neutral-5 dark:text-[var(--neutral-5)] mx-auto" strokeWidth={1.75} />
                  <p className="text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)]">
                    尚未连接 GitHub 账户
                  </p>
                  <Button variant="primary" size="md" onClick={() => window.location.href = "/api/auth/github"}>
                    <Github className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
                    连接 GitHub
                  </Button>
                </div>
              ) : githubRepos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)]">
                    没有可用的 GitHub 仓库
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {githubRepos.map((gr) => (
                    <div
                      key={gr.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 ring-1 ring-border bg-neutral-1 dark:bg-[var(--neutral-2)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)] truncate">
                          {gr.fullName}
                        </p>
                        <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] line-clamp-1 mt-0.5">
                          {gr.description || "无描述"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-label-11 text-neutral-5 dark:text-[var(--neutral-5)]">
                          {gr.language && <span>{gr.language}</span>}
                          <span>&#9733; {gr.stars}</span>
                          {gr.private && <span className="text-[var(--color-accent)]">私有</span>}
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={importing === gr.fullName}
                        onClick={() => handleImport(gr.fullName)}
                      >
                        {importing === gr.fullName ? (
                          <RefreshCw className="w-icon-sm h-icon-sm animate-spin" strokeWidth={1.75} />
                        ) : "导入"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 快速克隆弹窗 */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCloneModal(false)}>
          <div className="bg-paper dark:bg-[var(--neutral-1)] rounded-xl ring-1 ring-border shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-serif text-title-18 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
                快速克隆仓库
              </h3>
              <button
                onClick={() => setShowCloneModal(false)}
                className="grid place-items-center w-8 h-8 rounded-md text-neutral-5 dark:text-[var(--neutral-5)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] transition-colors"
              >
                <span className="text-copy-16 leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {cloneRepoName ? (
                <div>
                  <label className="block text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] mb-1">
                    目标仓库
                  </label>
                  <p className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                    {cloneRepoName}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] mb-1">
                    目标仓库
                  </label>
                  <select
                    value={cloneRepoId ?? ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      setCloneRepoId(id || null);
                      setCloneRepoName(id ? repos.find((r) => r.id === id)?.name ?? null : null);
                    }}
                    className="w-full rounded-md bg-neutral-2 dark:bg-[var(--neutral-2)] ring-1 ring-border px-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-shadow duration-300 ease-breathe"
                  >
                    <option value="">选择仓库…</option>
                    {repos.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] mb-1">
                  Git 克隆地址
                </label>
                <input
                  type="text"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="w-full rounded-md bg-neutral-2 dark:bg-[var(--neutral-2)] ring-1 ring-border px-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] placeholder:text-neutral-5 dark:placeholder:text-[var(--neutral-5)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-shadow duration-300 ease-breathe"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="md" onClick={() => setShowCloneModal(false)}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={!cloneUrl.trim() || !cloneRepoId || cloneLoading}
                  onClick={handleClone}
                >
                  {cloneLoading ? (
                    <RefreshCw className="w-icon-sm h-icon-sm animate-spin" strokeWidth={1.75} />
                  ) : (
                    "克隆"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
