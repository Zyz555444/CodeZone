// CodeZone · 共享类型定义
// 前后端共用的实体与响应类型

export type UserRole = "member" | "maintainer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  createdAt: number;
}

export interface Repo {
  id: string;
  name: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  defaultBranch: string;
  ownerId: string;
  updatedAt: number;
  openIssues: number;
  openPRs: number;
}

export type IssueStatus = "open" | "in_progress" | "review" | "closed";

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Issue {
  id: string;
  repoId: string;
  number: number;
  title: string;
  body: string;
  status: IssueStatus;
  priority: "low" | "normal" | "high";
  assigneeId: string | null;
  labels: Label[];
  milestone: string | null;
  createdAt: number;
  updatedAt: number;
  commentCount: number;
}

export type PRStatus = "open" | "merged" | "closed" | "draft";

export interface PRFile {
  path: string;
  status: "added" | "modified" | "removed";
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffLine {
  type: "context" | "add" | "remove";
  oldNumber: number | null;
  newNumber: number | null;
  content: string;
}

export interface DiffHunk {
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
}

export interface PullRequest {
  id: string;
  repoId: string;
  number: number;
  title: string;
  body: string;
  status: PRStatus;
  authorId: string;
  sourceBranch: string;
  targetBranch: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  checks: { name: string; status: "pending" | "success" | "failed" }[];
  reviewers: string[];
  createdAt: number;
  updatedAt: number;
  files: PRFile[];
  commentCount: number;
}

export interface Commit {
  id: string;
  repoId: string;
  sha: string;
  message: string;
  authorId: string;
  additions: number;
  deletions: number;
  createdAt: number;
}

export type CommentTarget = "issue" | "pull" | "discussion";

export interface Comment {
  id: string;
  targetType: CommentTarget;
  targetId: string;
  authorId: string;
  body: string;
  lineNumber: number | null;
  createdAt: number;
}

export type PipelineStatus = "pending" | "running" | "success" | "failed";

export interface PipelineStage {
  id: string;
  name: string;
  status: PipelineStatus;
  durationMs: number;
  log: string;
}

export interface Pipeline {
  id: string;
  repoId: string;
  commitSha: string;
  commitMessage: string;
  status: PipelineStatus;
  trigger: "push" | "manual" | "schedule";
  authorId: string;
  branch: string;
  stages: PipelineStage[];
  createdAt: number;
  durationMs: number;
}

export interface Discussion {
  id: string;
  repoId: string;
  title: string;
  category: string;
  authorId: string;
  body: string;
  pinned: boolean;
  replyCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
  content?: string;
  language?: string;
}

export type ActivityType =
  | "commit"
  | "issue"
  | "pull_request"
  | "comment"
  | "pipeline"
  | "merge";

export interface Activity {
  id: string;
  type: ActivityType;
  actorId: string;
  repoId: string;
  description: string;
  createdAt: number;
}

export interface DashboardStats {
  weeklyCommits: number;
  weeklyMerges: number;
  pendingReviews: number;
  pipelinePassRate: number;
  openIssues: number;
  activeRepos: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
