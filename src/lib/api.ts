// CodeZone · API 客户端
import type {
  User, Repo, Issue, PullRequest, Commit, Comment,
  Pipeline, Discussion, Activity, DashboardStats, IssueStatus, PRFile,
} from "./types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `请求失败 (${res.status})`);
  }
  const json = await res.json();
  return json.data as T;
}

export const api = {
  // 工作台
  getActivities: (limit = 15) =>
    request<(Activity & { actor: User; repo: Repo })[]>(`/dashboard/activities?limit=${limit}`),
  getStats: () => request<DashboardStats>("/dashboard/stats"),

  // 仓库
  getRepos: () => request<Repo[]>("/repos"),
  getRepo: (id: string) => request<Repo>(`/repos/${id}`),
  getFileTree: (repoId: string, path = "") =>
    request<any>(`/repos/${repoId}/contents/${path}`),
  getCommits: (repoId: string) => request<Commit[]>(`/repos/${repoId}/commits`),

  // 议题
  getIssues: (repoId: string, status = "all") =>
    request<Issue[]>(`/repos/${repoId}/issues${status !== "all" ? `?status=${status}` : ""}`),
  getIssue: (repoId: string, issueId: string) =>
    request<Issue & { comments: Comment[] }>(`/repos/${repoId}/issues/${issueId}`),
  updateIssueStatus: (repoId: string, issueId: string, status: IssueStatus) =>
    request<Issue>(`/repos/${repoId}/issues/${issueId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // 合并请求
  getPRs: (repoId: string, status = "all") =>
    request<PullRequest[]>(`/repos/${repoId}/pulls${status !== "all" ? `?status=${status}` : ""}`),
  getPR: (repoId: string, prId: string) =>
    request<PullRequest & { comments: Comment[] }>(`/repos/${repoId}/pulls/${prId}`),

  // 讨论
  getDiscussions: (repoId: string) =>
    request<Discussion[]>(`/repos/${repoId}/discussions`),

  // 流水线
  getPipelines: (repoId: string) =>
    request<Pipeline[]>(`/pipelines/${repoId}/pipelines`),
  getPipeline: (runId: string) =>
    request<Pipeline>(`/pipelines/run/${runId}`),

  // 团队
  getTeam: () => request<User[]>("/team"),
};
