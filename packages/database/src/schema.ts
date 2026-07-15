/**
 * CodeZone · Drizzle ORM Schema (PostgreSQL)
 *
 * 生产级数据模型,镜像 @codezone/shared 类型。
 * 所有时间戳以 BIGINT (Unix ms) 存储,避免时区问题。
 */
import {
  pgTable, text, bigint, integer, boolean, jsonb, serial, varchar,
  primaryKey, index,
} from "drizzle-orm/pg-core";

// ───────────────────────────── 用户 ─────────────────────────────
export const users = pgTable("users", {
  id: varchar("id", { length: 32 }).primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  avatar: text("avatar"),
  role: varchar("role", { length: 16 }).notNull().default("member"), // member | maintainer | admin
    githubToken: varchar("github_token", { length: 128 }),
  githubUsername: varchar("github_username", { length: 64 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// ───────────────────────────── 仓库 ─────────────────────────────
export const repos = pgTable("repos", {
  id: varchar("id", { length: 32 }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description").notNull().default(""),
  language: varchar("language", { length: 32 }).notNull().default(""),
  languageColor: varchar("language_color", { length: 16 }).notNull().default("#787670"),
  stars: integer("stars").notNull().default(0),
  defaultBranch: varchar("default_branch", { length: 64 }).notNull().default("main"),
  ownerId: varchar("owner_id", { length: 32 }).notNull().references(() => users.id),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

// ───────────────────────────── 标签 ─────────────────────────────
export const labels = pgTable("labels", {
  id: varchar("id", { length: 32 }).primaryKey(),
  repoId: varchar("repo_id", { length: 32 }).notNull().references(() => repos.id),
  name: varchar("name", { length: 64 }).notNull(),
  color: varchar("color", { length: 16 }).notNull().default("#787670"),
}, (t) => ({
  repoIdx: index("labels_repo_idx").on(t.repoId),
}));

// ───────────────────────────── 议题 ─────────────────────────────
export const issues = pgTable("issues", {
  id: varchar("id", { length: 32 }).primaryKey(),
  repoId: varchar("repo_id", { length: 32 }).notNull().references(() => repos.id),
  number: integer("number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull().default(""),
  status: varchar("status", { length: 16 }).notNull().default("open"),
  priority: varchar("priority", { length: 8 }).notNull().default("normal"),
  assigneeId: varchar("assignee_id", { length: 32 }),
  labels: jsonb("labels").notNull().default([]),
  milestone: varchar("milestone", { length: 64 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (t) => ({
  repoIdx: index("issues_repo_idx").on(t.repoId),
  statusIdx: index("issues_status_idx").on(t.status),
}));

// ───────────────────────────── 合并请求 ─────────────────────────────
export const pullRequests = pgTable("pull_requests", {
  id: varchar("id", { length: 32 }).primaryKey(),
  repoId: varchar("repo_id", { length: 32 }).notNull().references(() => repos.id),
  number: integer("number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull().default(""),
  status: varchar("status", { length: 16 }).notNull().default("open"),
  authorId: varchar("author_id", { length: 32 }).notNull().references(() => users.id),
  sourceBranch: varchar("source_branch", { length: 64 }).notNull(),
  targetBranch: varchar("target_branch", { length: 64 }).notNull(),
  additions: integer("additions").notNull().default(0),
  deletions: integer("deletions").notNull().default(0),
  changedFiles: integer("changed_files").notNull().default(0),
  checks: jsonb("checks").notNull().default([]),
  reviewers: jsonb("reviewers").notNull().default([]),
  files: jsonb("files").notNull().default([]),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (t) => ({
  repoIdx: index("prs_repo_idx").on(t.repoId),
  statusIdx: index("prs_status_idx").on(t.status),
}));

// ───────────────────────────── 提交 ─────────────────────────────
export const commits = pgTable("commits", {
  id: varchar("id", { length: 32 }).primaryKey(),
  repoId: varchar("repo_id", { length: 32 }).notNull().references(() => repos.id),
  sha: varchar("sha", { length: 40 }).notNull(),
  message: text("message").notNull(),
  authorId: varchar("author_id", { length: 32 }).notNull().references(() => users.id),
  additions: integer("additions").notNull().default(0),
  deletions: integer("deletions").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (t) => ({
  repoIdx: index("commits_repo_idx").on(t.repoId),
}));

// ───────────────────────────── 评论 ─────────────────────────────
export const comments = pgTable("comments", {
  id: varchar("id", { length: 32 }).primaryKey(),
  targetType: varchar("target_type", { length: 16 }).notNull(),
  targetId: varchar("target_id", { length: 32 }).notNull(),
  authorId: varchar("author_id", { length: 32 }).notNull().references(() => users.id),
  body: text("body").notNull(),
  lineNumber: integer("line_number"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (t) => ({
  targetIdx: index("comments_target_idx").on(t.targetType, t.targetId),
}));

// ───────────────────────────── 流水线 ─────────────────────────────
export const pipelines = pgTable("pipelines", {
  id: varchar("id", { length: 32 }).primaryKey(),
  repoId: varchar("repo_id", { length: 32 }).notNull().references(() => repos.id),
  commitSha: varchar("commit_sha", { length: 40 }).notNull(),
  commitMessage: text("commit_message").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  trigger: varchar("trigger", { length: 16 }).notNull().default("push"),
  authorId: varchar("author_id", { length: 32 }).notNull().references(() => users.id),
  branch: varchar("branch", { length: 64 }).notNull(),
  stages: jsonb("stages").notNull().default([]),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (t) => ({
  repoIdx: index("pipelines_repo_idx").on(t.repoId),
}));

// ───────────────────────────── 讨论 ─────────────────────────────
export const discussions = pgTable("discussions", {
  id: varchar("id", { length: 32 }).primaryKey(),
  repoId: varchar("repo_id", { length: 32 }).notNull().references(() => repos.id),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 32 }).notNull().default("general"),
  authorId: varchar("author_id", { length: 32 }).notNull().references(() => users.id),
  body: text("body").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  replyCount: integer("reply_count").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (t) => ({
  repoIdx: index("discussions_repo_idx").on(t.repoId),
}));

// ───────────────────────────── 活动 ─────────────────────────────
export const activities = pgTable("activities", {
  id: varchar("id", { length: 32 }).primaryKey(),
  type: varchar("type", { length: 16 }).notNull(),
  actorId: varchar("actor_id", { length: 32 }).notNull().references(() => users.id),
  repoId: varchar("repo_id", { length: 32 }).notNull().references(() => repos.id),
  description: text("description").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (t) => ({
  repoIdx: index("activities_repo_idx").on(t.repoId),
  createdIdx: index("activities_created_idx").on(t.createdAt),
}));

// ───────────────────────────── 文件树 ─────────────────────────────
export const fileTrees = pgTable("file_trees", {
  repoId: varchar("repo_id", { length: 32 }).notNull().references(() => repos.id),
  nodes: jsonb("nodes").notNull().default([]),
}, (t) => ({
  pk: primaryKey({ columns: [t.repoId] }),
}));

// ───────────────────────────── 里程碑 ─────────────────────────────
export const milestones = pgTable("milestones", {
  id: varchar("id", { length: 32 }).primaryKey(),
  repoId: varchar("repo_id", { length: 32 }).notNull().references(() => repos.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  dueDate: bigint("due_date", { mode: "number" }).notNull(),
  status: varchar("status", { length: 8 }).notNull().default("open"),
  progress: integer("progress").notNull().default(0),
  openIssues: integer("open_issues").notNull().default(0),
  closedIssues: integer("closed_issues").notNull().default(0),
  totalIssues: integer("total_issues").notNull().default(0),
}, (t) => ({
  repoIdx: index("milestones_repo_idx").on(t.repoId),
}));

// ───────────────────────────── 团队 ─────────────────────────────
export const teams = pgTable("teams", {
  id: varchar("id", { length: 32 }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  ownerId: varchar("owner_id", { length: 32 }).notNull().references(() => users.id),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const teamMembers = pgTable("team_members", {
  teamId: varchar("team_id", { length: 32 }).notNull().references(() => teams.id),
  userId: varchar("user_id", { length: 32 }).notNull().references(() => users.id),
  role: varchar("role", { length: 16 }).notNull().default("member"), // owner | admin | member
  joinedAt: bigint("joined_at", { mode: "number" }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.teamId, t.userId] }),
  userIdx: index("tm_user_idx").on(t.userId),
}));

export const inviteCodes = pgTable("invite_codes", {
  id: varchar("id", { length: 32 }).primaryKey(),
  teamId: varchar("team_id", { length: 32 }).notNull().references(() => teams.id),
  code: varchar("code", { length: 16 }).notNull().unique(),
  createdBy: varchar("created_by", { length: 32 }).notNull().references(() => users.id),
  maxUses: integer("max_uses").notNull().default(0), // 0 = 无限制
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: bigint("expires_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (t) => ({
  teamIdx: index("ic_team_idx").on(t.teamId),
  codeIdx: index("ic_code_idx").on(t.code),
}));

// ───────────────────────────── 协作文档 ─────────────────────────────
export const documents = pgTable("documents", {
  id: varchar("id", { length: 32 }).primaryKey(),
  teamId: varchar("team_id", { length: 32 }).notNull().references(() => teams.id),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull().default(""),
  language: varchar("language", { length: 32 }).notNull().default("typescript"),
  createdBy: varchar("created_by", { length: 32 }).notNull().references(() => users.id),
  lastEditedBy: varchar("last_edited_by", { length: 32 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (t) => ({
  teamIdx: index("docs_team_idx").on(t.teamId),
  updatedIdx: index("docs_updated_idx").on(t.updatedAt),
}));

// ───────────────────────────── 文档版本快照 ─────────────────────────────
export const documentVersions = pgTable("document_versions", {
  id: varchar("id", { length: 32 }).primaryKey(),
  docId: varchar("doc_id", { length: 32 }).notNull().references(() => documents.id),
  content: text("content").notNull(),
  authorId: varchar("author_id", { length: 32 }).notNull().references(() => users.id),
  message: varchar("message", { length: 255 }).notNull().default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (t) => ({
  docIdx: index("docver_doc_idx").on(t.docId),
  createdIdx: index("docver_created_idx").on(t.createdAt),
}));

// ───────────────────────────── 文档行内评论 ─────────────────────────────
export const documentComments = pgTable("document_comments", {
  id: varchar("id", { length: 32 }).primaryKey(),
  docId: varchar("doc_id", { length: 32 }).notNull().references(() => documents.id),
  authorId: varchar("author_id", { length: 32 }).notNull().references(() => users.id),
  body: text("body").notNull(),
  lineNumber: integer("line_number"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (t) => ({
  docIdx: index("doccom_doc_idx").on(t.docId),
}));

// ───────────────────────────── 通知 ─────────────────────────────
export const notifications = pgTable("notifications", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: varchar("user_id", { length: 32 }).notNull().references(() => users.id),
  type: varchar("type", { length: 16 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull().default(""),
  read: boolean("read").notNull().default(false),
  actorId: varchar("actor_id", { length: 32 }),
  targetType: varchar("target_type", { length: 16 }),
  targetId: varchar("target_id", { length: 32 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (t) => ({
  userIdx: index("notifications_user_idx").on(t.userId, t.read),
}));
