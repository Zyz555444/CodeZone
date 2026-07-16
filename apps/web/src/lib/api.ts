// CodeZone · API 客户端
import type {
  User, Repo, Issue, PullRequest, Commit, Comment,
  Pipeline, Discussion, Activity, DashboardStats, IssueStatus,
  Milestone, AppNotification, Team, TeamMember, InviteCode, TeamRole,
  Document, DocumentVersion, DocumentComment, MeResponse,
} from "./types";

// 拆分部署时,前端(Vercel)与后端(Railway)不同源;
// 通过 VITE_API_BASE 注入后端地址,未设置则回退到同源 /api (本地开发或同域部署)
const BASE = import.meta.env.VITE_API_BASE ?? "/api";

// ─────────── 令牌存储 ───────────
// 优先使用 sessionStorage (页面级作用域,XSS 持久化盗取风险更低),
// 兼容旧版 localStorage 迁移:启动时若 localStorage 仍有 token 则一次性搬入。
const TOKEN_KEY = "codezone_token";

function readTokenFromAnyStore(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const tokenStore = {
  get: () => {
    const t = readTokenFromAnyStore();
    // 读时迁移:从 localStorage 读出后立即写入 sessionStorage 并清理
    if (t && !sessionStorage.getItem(TOKEN_KEY)) {
      try {
        sessionStorage.setItem(TOKEN_KEY, t);
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* 忽略 */
      }
    }
    return t;
  },
  set: (t: string) => {
    try {
      sessionStorage.setItem(TOKEN_KEY, t);
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* 忽略 */
    }
  },
  clear: () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* 忽略 */
    }
  },
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers, ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `请求失败 (${res.status})`);
  }
  // 204 / 205 / 空 body:返回 undefined,由调用方按需使用
  if (res.status === 204 || res.status === 205) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return (JSON.parse(text) as { data: T }).data;
  } catch {
    throw new Error("服务器返回了非 JSON 响应");
  }
}

export const api = {
  // ─────────── 认证 ───────────
  login: (email: string, password: string) =>
    request<{ user: User; token: string; team?: Team; teamRole?: TeamRole | null }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  registerAdmin: (name: string, email: string, password: string, teamName: string) =>
    request<{ user: User; token: string; team: Team }>("/auth/register-admin", {
      method: "POST",
      body: JSON.stringify({ name, email, password, teamName }),
    }),
  joinByInvite: (name: string, email: string, password: string, inviteCode: string) =>
    request<{ user: User; token: string; team: Team }>("/auth/join-by-invite", {
      method: "POST",
      body: JSON.stringify({ name, email, password, inviteCode }),
    }),
  me: () => request<MeResponse>("/auth/me"),
  logout: () => {
    tokenStore.clear();
    return Promise.resolve();
  },

  // ─────────── 工作台 ───────────
  getActivities: (limit = 15) =>
    request<(Activity & { actor: User; repo: Repo })[]>(`/dashboard/activities?limit=${limit}`),
  getStats: () => request<DashboardStats>("/dashboard/stats"),

  // ─────────── 仓库 ───────────
  getRepos: () => request<Repo[]>("/repos"),
  getRepo: (id: string) => request<Repo>(`/repos/${id}`),
  createRepo: (data: { name: string; description?: string; visibility?: "public" | "private" }) =>
    request<Repo>("/repos", { method: "POST", body: JSON.stringify(data) }),
  getFileTree: (repoId: string, path = "") =>
    request<any>(`/repos/${repoId}/contents/${path}`),
  getCommits: (repoId: string) => request<Commit[]>(`/repos/${repoId}/commits`),
  githubRepos: () => request<{ id: number; name: string; fullName: string; description: string; language: string; stars: number; defaultBranch: string; private: boolean; updatedAt: number; cloneUrl: string; htmlUrl: string }[]>(
    "/github/repos"
  ),
  githubImport: (fullName: string) => request<Repo>("/github/import", { method: "POST", body: JSON.stringify({ fullName }) }),

  // ─────────── 第三方登录 ───────────
  getAuthProviders: () => request<{ github: boolean; google: boolean }>("/auth/providers"),
  githubLogin: () => {
    window.location.href = `${BASE}/auth/github`;
  },
  googleLogin: () => {
    window.location.href = `${BASE}/auth/google`;
  },

  // ─────────── GitHub 集成 ───────────
  githubConnected: () => request<{ connected: boolean; githubUsername: string | null }>("/github/connected"),
  githubDisconnect: () => request<{ success: boolean }>("/github/disconnect", { method: "POST" }),

  // ─────────── Git 操作 ───────────
  gitBranches: (repoId: string) => request<{ branches: string[]; current: string }>(`/git/${repoId}/branches`),
  gitCreateBranch: (repoId: string, name: string, from?: string) => request<{ name: string; from: string }>(`/git/${repoId}/branch`, { method: "POST", body: JSON.stringify({ name, from }) }),
  gitCheckout: (repoId: string, branch: string) => request<{ branch: string }>(`/git/${repoId}/checkout`, { method: "POST", body: JSON.stringify({ branch }) }),
  gitDeleteBranch: (repoId: string, name: string) => request<{ success: boolean }>(`/git/${repoId}/branch/${name}`, { method: "DELETE" }),
  gitMerge: (repoId: string, from: string, target?: string) => request<{ merged: string; into: string }>(`/git/${repoId}/merge`, { method: "POST", body: JSON.stringify({ from, target }) }),
  gitStatus: (repoId: string) => request<{ cloned: boolean; status: string; branch: string; ahead: number; behind: number; dirty: boolean }>(`/git/${repoId}/status`),
  gitClone: (repoId: string, url?: string) => request<{ message: string; path: string }>(`/git/${repoId}/clone`, { method: "POST", body: JSON.stringify({ url }) }),
  gitPull: (repoId: string) => request<{ output: string }>(`/git/${repoId}/pull`, { method: "POST" }),
  gitCommit: (repoId: string, message: string, files: { path: string; content: string }[]) => request<{ message: string }>(`/git/${repoId}/commit`, { method: "POST", body: JSON.stringify({ message, files }) }),
  gitBlame: (repoId: string, filePath: string) => request<{ lines: { sha: string; author: string; date: string; line: number }[] }>(`/git/${repoId}/blame/${encodeURIComponent(filePath)}`),
  gitPush: (repoId: string) => request<{ output: string; branch: string }>(`/git/${repoId}/push`, { method: "POST" }),
  gitGraph: (repoId: string, max?: number) => request<{ log: string; branches: string[] }>(`/git/${repoId}/graph?max=${max ?? 30}`),
  gitWriteFile: (repoId: string, path: string, content: string) => request<{ path: string; written: boolean }>(`/git/${repoId}/file`, { method: "POST", body: JSON.stringify({ path, content }) }),
  gitDeleteFile: (repoId: string, path: string) => request<{ path: string; deleted: boolean }>(`/git/${repoId}/file`, { method: "DELETE", body: JSON.stringify({ path }) }),

  githubSyncIssues: (repoId: string) => request<{ synced: number; total: number }>("/github/sync-issues", { method: "POST", body: JSON.stringify({ repoId }) }),
  githubSyncPulls: (repoId: string) => request<{ synced: number; total: number }>("/github/sync-pulls", { method: "POST", body: JSON.stringify({ repoId }) }),
  githubSyncCommits: (repoId: string) => request<{ synced: number; total: number }>("/github/sync-commits", { method: "POST", body: JSON.stringify({ repoId }) }),
  githubCreatePR: (repoId: string, title: string, head: string, base: string, body?: string) => request<{ url: string; number: number }>("/github/create-pr", { method: "POST", body: JSON.stringify({ repoId, title, head, base, body }) }),

  // ─────────── 议题 ───────────
  getIssues: (repoId: string, status = "all") =>
    request<Issue[]>(`/repos/${repoId}/issues${status !== "all" ? `?status=${status}` : ""}`),
  getIssue: (repoId: string, issueId: string) =>
    request<Issue & { comments: Comment[] }>(`/repos/${repoId}/issues/${issueId}`),
  updateIssueStatus: (repoId: string, issueId: string, status: IssueStatus) =>
    request<Issue>(`/repos/${repoId}/issues/${issueId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  createIssue: (repoId: string, data: { title: string; body: string; priority?: string }) =>
    request<Issue>(`/repos/${repoId}/issues`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ─────────── 合并请求 ───────────
  getPRs: (repoId: string, status = "all") =>
    request<PullRequest[]>(`/repos/${repoId}/pulls${status !== "all" ? `?status=${status}` : ""}`),
  getPR: (repoId: string, prId: string) =>
    request<PullRequest & { comments: Comment[] }>(`/repos/${repoId}/pulls/${prId}`),
  mergePR: (repoId: string, prId: string, strategy: "merge" | "squash" | "rebase" = "merge") =>
    request<{ pr: PullRequest; strategy: string }>(`/repos/${repoId}/pulls/${prId}/merge`, {
      method: "POST",
      body: JSON.stringify({ strategy }),
    }),

  // ─────────── 讨论 ───────────
  getDiscussions: (repoId: string) =>
    request<Discussion[]>(`/repos/${repoId}/discussions`),

  // ─────────── 流水线 ───────────
  getPipelines: (repoId: string) =>
    request<Pipeline[]>(`/pipelines/${repoId}/pipelines`),
  getPipeline: (runId: string) =>
    request<Pipeline>(`/pipelines/run/${runId}`),
  triggerPipeline: (repoId: string, branch?: string) =>
    request<Pipeline>(`/pipelines/${repoId}/pipelines`, {
      method: "POST",
      body: JSON.stringify({ branch }),
    }),
  retryPipeline: (runId: string) =>
    request<Pipeline>(`/pipelines/run/${runId}/retry`, { method: "POST" }),
  cancelPipeline: (runId: string) =>
    request<Pipeline>(`/pipelines/run/${runId}/cancel`, { method: "POST" }),

  // ─────────── 团队 ───────────
  getTeam: () => request<User[]>("/team"),
  getTeamDetail: () => request<{ team: Team; members: TeamMember[]; myRole: TeamRole }>("/team"),
  createTeam: (name: string) =>
    request<{ team: Team; members: TeamMember[]; myRole: TeamRole }>("/team", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateTeam: (name: string) =>
    request<Team>("/team", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  joinTeam: (code: string) =>
    request<{ team: Team; members: TeamMember[]; myRole: TeamRole }>("/team/join", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  getInviteCodes: () => request<InviteCode[]>("/team/invite-codes"),
  createInviteCode: (maxUses?: number, expiresInDays?: number) =>
    request<InviteCode>("/team/invite-codes", {
      method: "POST",
      body: JSON.stringify({ maxUses, expiresInDays }),
    }),
  deleteInviteCode: (id: string) =>
    request<{ success: boolean }>(`/team/invite-codes/${id}`, { method: "DELETE" }),
  updateMemberRole: (userId: string, role: TeamRole) =>
    request<{ success: boolean }>(`/team/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  removeMember: (userId: string) =>
    request<{ success: boolean }>(`/team/members/${userId}`, { method: "DELETE" }),
  leaveTeam: () => request<{ success: boolean }>("/team/leave", { method: "POST" }),
  getOnlineCount: () => request<{ total: number; teamOnline: number }>("/team/online"),

  // ─────────── 里程碑 ───────────
  getMilestones: () => request<Milestone[]>("/milestones"),
  getMilestonesByRepo: (repoId: string) =>
    request<Milestone[]>(`/milestones/repo/${repoId}`),
  createMilestone: (data: { repoId: string; title: string; description: string; dueDate: number }) =>
    request<Milestone>("/milestones", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ─────────── 通知 ───────────
  getNotifications: (filter = "all") =>
    request<AppNotification[]>(`/notifications${filter !== "all" ? `?filter=${filter}` : ""}`),
  getUnreadCount: () => request<{ count: number }>("/notifications/unread-count"),
  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () =>
    request<{ success: boolean }>("/notifications/read-all", { method: "POST" }),

  // ─────────── 协作文档 ───────────
  getDocs: () => request<Document[]>("/docs"),
  getDoc: (id: string) => request<Document>(`/docs/${id}`),
  createDoc: (data: { title: string; content?: string; language?: string }) =>
    request<Document>("/docs", { method: "POST", body: JSON.stringify(data) }),
  updateDocTitle: (id: string, title: string) =>
    request<Document>(`/docs/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  deleteDoc: (id: string) =>
    request<{ success: boolean }>(`/docs/${id}`, { method: "DELETE" }),
  saveDoc: (id: string, content: string) =>
    request<Document>(`/docs/${id}/save`, { method: "POST", body: JSON.stringify({ content }) }),
  getDocVersions: (id: string, limit = 30) =>
    request<DocumentVersion[]>(`/docs/${id}/versions?limit=${limit}`),
  getDocVersion: (docId: string, vid: string) =>
    request<DocumentVersion>(`/docs/${docId}/versions/${vid}`),
  createDocVersion: (id: string, content: string, message?: string) =>
    request<DocumentVersion>(`/docs/${id}/versions`, {
      method: "POST",
      body: JSON.stringify({ content, message }),
    }),
  getDocComments: (id: string) =>
    request<(DocumentComment & { author?: User })[]>(`/docs/${id}/comments`),
  createDocComment: (id: string, body: string, lineNumber?: number) =>
    request<DocumentComment>(`/docs/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, lineNumber }),
    }),
  resolveDocComment: (docId: string, commentId: string, resolved: boolean) =>
    request<{ success: boolean }>(`/docs/${docId}/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({ resolved }),
    }),
  deleteDocComment: (docId: string, commentId: string) =>
    request<{ success: boolean }>(`/docs/${docId}/comments/${commentId}`, { method: "DELETE" }),
  getDocPresence: (id: string) =>
    request<{ onlineCount: number }>(`/docs/${id}/presence`),
};
