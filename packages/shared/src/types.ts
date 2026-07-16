// CodeZone · 共享类型定义
// 前后端共用的实体与响应类型

export type UserRole = "member" | "maintainer" | "admin";
export type TeamRole = "owner" | "admin" | "member";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  githubToken?: string | null;
  githubUsername?: string | null;
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

export interface Milestone {
  id: string;
  repoId: string;
  title: string;
  description: string;
  dueDate: number;
  status: "open" | "closed";
  progress: number; // 0-100
  openIssues: number;
  closedIssues: number;
  totalIssues: number;
}

export type NotificationType = "mention" | "review" | "assign" | "ci" | "follow";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  createdAt: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ───────────────────────────── 团队 ─────────────────────────────
export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: number;
  // 后端额外填充的成员信息(便于前端直接展示)
  name?: string;
  email?: string;
  avatar?: string | null;
  user?: User;
}

export interface InviteCode {
  id: string;
  teamId: string;
  code: string;
  createdBy: string;
  maxUses: number;
  usedCount: number;
  expiresAt: number | null;
  createdAt: number;
}

// ───────────────────────────── 协作文档 ─────────────────────────────
export interface Document {
  id: string;
  teamId: string;
  title: string;
  content: string;
  language: string;
  createdBy: string;
  lastEditedBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentVersion {
  id: string;
  docId: string;
  content: string;
  authorId: string;
  message: string;
  createdAt: number;
}

export interface DocumentComment {
  id: string;
  docId: string;
  authorId: string;
  body: string;
  lineNumber: number | null;
  resolved: boolean;
  createdAt: number;
}

/** /auth/me 响应 — User 附带团队信息 */
export interface MeResponse extends User {
  team: Team | null;
  teamRole: TeamRole | null;
}

// ───────────────────────────── 协作 CRDT 类型 ─────────────────────────────
export interface CharId {
  client: number;
  clock: number;
}

export interface TextOp {
  type: "insert" | "delete";
  client: number;
  clock: number;
  offset: number;
  content?: string;
  length?: number;
  timestamp: number;
}

export interface CursorState {
  lineNumber: number;
  column: number;
  selectionStart?: { lineNumber: number; column: number };
  selectionEnd?: { lineNumber: number; column: number };
}

export interface Collaborator {
  id: number;
  name: string;
  color: string;
  avatarInitial: string;
  isLocal: boolean;
  online: boolean;
  cursor: CursorState | null;
  lastActive: number;
}

// ───────────────────────────── WebSocket 消息协议 ─────────────────────────────
export interface WSOnlineCountMessage {
  type: "online_count";
  total: number;
  teamOnline: number;
  teamId: string | null;
}

export interface WSUserStatusMessage {
  type: "user_status";
  userId: string;
  name: string;
  status: "online" | "offline";
}

export interface WSJoinRoomMessage {
  type: "join_room";
  docId: string;
}

export interface WSLeaveRoomMessage {
  type: "leave_room";
  docId: string;
}

export interface WSDocOpMessage {
  type: "doc_op";
  docId: string;
  op: TextOp;
  client: number;
  clientName: string;
}

export interface WSAwarenessMessage {
  type: "awareness";
  docId: string;
  collaborator: Collaborator;
}

export interface WSPresenceMessage {
  type: "presence";
  docId: string;
  collaborators: Collaborator[];
}

export interface WSRoomJoinedMessage {
  type: "room_joined";
  docId: string;
  content: string;
  collaborators: Collaborator[];
  clientId: number;
}

export interface WSErrorMessage {
  type: "error";
  message: string;
  code?: number;
}

export type WSMessage =
  | WSOnlineCountMessage
  | WSUserStatusMessage
  | WSJoinRoomMessage
  | WSLeaveRoomMessage
  | WSDocOpMessage
  | WSAwarenessMessage
  | WSPresenceMessage
  | WSRoomJoinedMessage
  | WSErrorMessage;
