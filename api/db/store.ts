// CodeZone · 仓储层
// 对内存数据提供类型化的 CRUD 访问
import * as seed from "./seed";
import type {
  User, Repo, Issue, PullRequest, Commit, Comment,
  Pipeline, Discussion, Activity, FileNode, IssueStatus,
} from "@shared/types";

// 运行时可变副本 (支持 PATCH 写回)
const db = {
  users: [...seed.users],
  repos: [...seed.repos],
  issues: [...seed.issues],
  pullRequests: [...seed.pullRequests],
  commits: [...seed.commits],
  comments: [...seed.comments],
  pipelines: [...seed.pipelines],
  discussions: [...seed.discussions],
  activities: [...seed.activities],
  fileTrees: { ...seed.fileTrees },
};

export const store = {
  // 用户
  listUsers: (): User[] => db.users,
  getUser: (id: string): User | undefined => db.users.find((u) => u.id === id),
  getCurrentUser: (): User => db.users[0], // Mock: 当前登录用户为林知白

  // 仓库
  listRepos: (): Repo[] => db.repos,
  getRepo: (id: string): Repo | undefined => db.repos.find((r) => r.id === id),
  getFileTree: (repoId: string): FileNode[] | undefined =>
    db.fileTrees[repoId],

  // 议题
  listIssues: (repoId: string, status?: string): Issue[] =>
    db.issues
      .filter((i) => i.repoId === repoId)
      .filter((i) => (status && status !== "all" ? i.status === status : true))
      .sort((a, b) => b.number - a.number),
  getIssue: (repoId: string, issueId: string): Issue | undefined =>
    db.issues.find((i) => i.repoId === repoId && i.id === issueId),
  updateIssueStatus: (repoId: string, issueId: string, status: IssueStatus): Issue | undefined => {
    const issue = db.issues.find((i) => i.repoId === repoId && i.id === issueId);
    if (issue) {
      issue.status = status;
      issue.updatedAt = Date.now();
    }
    return issue;
  },

  // 合并请求
  listPRs: (repoId: string, status?: string): PullRequest[] =>
    db.pullRequests
      .filter((p) => p.repoId === repoId)
      .filter((p) => (status && status !== "all" ? p.status === status : true))
      .sort((a, b) => b.number - a.number),
  getPR: (repoId: string, prId: string): PullRequest | undefined =>
    db.pullRequests.find((p) => p.repoId === repoId && p.id === prId),

  // 提交
  listCommits: (repoId: string): Commit[] =>
    db.commits
      .filter((c) => c.repoId === repoId)
      .sort((a, b) => b.createdAt - a.createdAt),

  // 评论
  listComments: (targetType: string, targetId: string): Comment[] =>
    db.comments
      .filter((c) => c.targetType === targetType && c.targetId === targetId)
      .sort((a, b) => a.createdAt - b.createdAt),
  addComment: (comment: Omit<Comment, "id" | "createdAt">): Comment => {
    const newComment: Comment = {
      ...comment,
      id: `cm${Date.now()}`,
      createdAt: Date.now(),
    };
    db.comments.push(newComment);
    return newComment;
  },

  // 流水线
  listPipelines: (repoId: string): Pipeline[] =>
    db.pipelines
      .filter((p) => p.repoId === repoId)
      .sort((a, b) => b.createdAt - a.createdAt),
  getPipeline: (runId: string): Pipeline | undefined =>
    db.pipelines.find((p) => p.id === runId),

  // 讨论
  listDiscussions: (repoId: string): Discussion[] =>
    db.discussions
      .filter((d) => d.repoId === repoId)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt),

  // 工作台
  listActivities: (limit = 15): Activity[] =>
    [...db.activities].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit),
  getStats: () => ({
    weeklyCommits: db.commits.length + 18,
    weeklyMerges: 6,
    pendingReviews: db.pullRequests.filter((p) => p.status === "open").length,
    pipelinePassRate: 75,
    openIssues: db.issues.filter((i) => i.status !== "closed").length,
    activeRepos: db.repos.length,
  }),
};

export type Store = typeof store;
