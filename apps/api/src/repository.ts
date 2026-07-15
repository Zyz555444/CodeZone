/**
 * CodeZone · 数据仓储层
 *
 * 所有数据库查询的封装, 返回 @codezone/shared 类型。
 * 路由层只调用此模块, 不直接操作 db。
 */
import { eq, desc, asc, and, sql, count } from "drizzle-orm";
import { db, schema } from "@codezone/database";
import type {
  User, Repo, Issue, PullRequest, Commit, Comment,
  Pipeline, Discussion, Activity, FileNode, Milestone,
  AppNotification, DashboardStats, Label, IssueStatus, PRStatus,
  Team, TeamMember, InviteCode, TeamRole,
  Document, DocumentVersion, DocumentComment,
} from "@codezone/shared";

const now = () => Date.now();

// ───────────────────────────── 用户 ─────────────────────────────
export const userRepo = {
  async list(): Promise<User[]> {
    const rows = await db.select().from(schema.users).orderBy(asc(schema.users.createdAt));
    return rows as User[];
  },
  async getById(id: string): Promise<User | null> {
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return (rows[0] as User) ?? null;
  },
  async getByEmail(email: string): Promise<(User & { passwordHash: string | null }) | null> {
    const rows = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return (rows[0] as User & { passwordHash: string | null }) ?? null;
  },
  async create(data: { id: string; name: string; email: string; passwordHash: string | null; role?: string; avatar?: string }): Promise<User> {
    const row = {
      id: data.id,
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      avatar: data.avatar ?? "",
      role: data.role ?? "member",
      createdAt: now(),
    };
    await db.insert(schema.users).values(row);
    const { passwordHash: _ph, ...user } = row;
    return user as User;
  },
};

// ───────────────────────────── 仓库 ─────────────────────────────
export const repoRepo = {
  async list(): Promise<Repo[]> {
    const rows = await db.select().from(schema.repos).orderBy(desc(schema.repos.updatedAt));
    return rows as Repo[];
  },
  async getById(id: string): Promise<Repo | null> {
    const rows = await db.select().from(schema.repos).where(eq(schema.repos.id, id)).limit(1);
    return (rows[0] as Repo) ?? null;
  },
  async getFileTree(repoId: string): Promise<FileNode[]> {
    const rows = await db.select().from(schema.fileTrees).where(eq(schema.fileTrees.repoId, repoId)).limit(1);
    return (rows[0]?.nodes as FileNode[]) ?? [];
  },
};

// ───────────────────────────── 标签 ─────────────────────────────
export const labelRepo = {
  async listByRepo(repoId: string): Promise<Label[]> {
    const rows = await db.select().from(schema.labels).where(eq(schema.labels.repoId, repoId));
    return rows as Label[];
  },
};

// ───────────────────────────── 议题 ─────────────────────────────
export const issueRepo = {
  async list(repoId: string, status?: string): Promise<Issue[]> {
    const condition = status && status !== "all"
      ? and(eq(schema.issues.repoId, repoId), eq(schema.issues.status, status as IssueStatus))
      : eq(schema.issues.repoId, repoId);
    const rows = await db.select().from(schema.issues).where(condition).orderBy(desc(schema.issues.number));
    return rows as Issue[];
  },
  async getById(repoId: string, issueId: string): Promise<Issue | null> {
    const rows = await db.select().from(schema.issues)
      .where(and(eq(schema.issues.repoId, repoId), eq(schema.issues.id, issueId))).limit(1);
    return (rows[0] as Issue) ?? null;
  },
  async updateStatus(repoId: string, issueId: string, status: IssueStatus): Promise<Issue | null> {
    await db.update(schema.issues).set({ status, updatedAt: now() })
      .where(and(eq(schema.issues.repoId, repoId), eq(schema.issues.id, issueId)));
    return this.getById(repoId, issueId);
  },
  async create(data: { repoId: string; number: number; title: string; body: string; priority?: string; assigneeId?: string | null }): Promise<Issue> {
    const id = `i${Date.now()}`;
    const ts = now();
    const row = {
      id, repoId: data.repoId, number: data.number, title: data.title, body: data.body,
      status: "open" as IssueStatus, priority: (data.priority ?? "normal") as "low" | "normal" | "high",
      assigneeId: data.assigneeId ?? null, labels: [], milestone: null,
      createdAt: ts, updatedAt: ts,
    };
    await db.insert(schema.issues).values(row);
    return { ...row, commentCount: 0 } as Issue;
  },
};

// ───────────────────────────── 合并请求 ─────────────────────────────
export const prRepo = {
  async list(repoId: string, status?: string): Promise<PullRequest[]> {
    const condition = status && status !== "all"
      ? and(eq(schema.pullRequests.repoId, repoId), eq(schema.pullRequests.status, status as PRStatus))
      : eq(schema.pullRequests.repoId, repoId);
    const rows = await db.select().from(schema.pullRequests).where(condition).orderBy(desc(schema.pullRequests.number));
    return rows as PullRequest[];
  },
  async getById(repoId: string, prId: string): Promise<PullRequest | null> {
    const rows = await db.select().from(schema.pullRequests)
      .where(and(eq(schema.pullRequests.repoId, repoId), eq(schema.pullRequests.id, prId))).limit(1);
    return (rows[0] as PullRequest) ?? null;
  },
};

// ───────────────────────────── 提交 ─────────────────────────────
export const commitRepo = {
  async list(repoId: string): Promise<Commit[]> {
    const rows = await db.select().from(schema.commits).where(eq(schema.commits.repoId, repoId)).orderBy(desc(schema.commits.createdAt));
    return rows as Commit[];
  },
};

// ───────────────────────────── 评论 ─────────────────────────────
export const commentRepo = {
  async list(targetType: string, targetId: string): Promise<Comment[]> {
    const rows = await db.select().from(schema.comments)
      .where(and(eq(schema.comments.targetType, targetType), eq(schema.comments.targetId, targetId)))
      .orderBy(asc(schema.comments.createdAt));
    return rows as Comment[];
  },
  async create(data: { targetType: string; targetId: string; authorId: string; body: string; lineNumber?: number | null }): Promise<Comment> {
    const id = `cm${Date.now()}`;
    const row = { id, ...data, lineNumber: data.lineNumber ?? null, createdAt: now() };
    await db.insert(schema.comments).values(row);
    return row as Comment;
  },
};

// ───────────────────────────── 流水线 ─────────────────────────────
export const pipelineRepo = {
  async list(repoId: string): Promise<Pipeline[]> {
    const rows = await db.select().from(schema.pipelines).where(eq(schema.pipelines.repoId, repoId)).orderBy(desc(schema.pipelines.createdAt));
    return rows as Pipeline[];
  },
  async getById(runId: string): Promise<Pipeline | null> {
    const rows = await db.select().from(schema.pipelines).where(eq(schema.pipelines.id, runId)).limit(1);
    return (rows[0] as Pipeline) ?? null;
  },
};

// ───────────────────────────── 讨论 ─────────────────────────────
export const discussionRepo = {
  async list(repoId: string): Promise<Discussion[]> {
    const rows = await db.select().from(schema.discussions).where(eq(schema.discussions.repoId, repoId))
      .orderBy(desc(schema.discussions.pinned), desc(schema.discussions.updatedAt));
    return rows as Discussion[];
  },
};

// ───────────────────────────── 活动 ─────────────────────────────
export const activityRepo = {
  async list(limit = 15): Promise<Activity[]> {
    const rows = await db.select().from(schema.activities).orderBy(desc(schema.activities.createdAt)).limit(limit);
    return rows as Activity[];
  },
};

// ───────────────────────────── 里程碑 ─────────────────────────────
export const milestoneRepo = {
  async list(): Promise<Milestone[]> {
    const rows = await db.select().from(schema.milestones);
    return rows as Milestone[];
  },
  async listByRepo(repoId: string): Promise<Milestone[]> {
    const rows = await db.select().from(schema.milestones).where(eq(schema.milestones.repoId, repoId));
    return rows as Milestone[];
  },
};

// ───────────────────────────── 通知 ─────────────────────────────
export const notificationRepo = {
  async listByUser(userId: string, filter?: string): Promise<AppNotification[]> {
    const baseCond = eq(schema.notifications.userId, userId);
    const cond = filter && filter !== "all"
      ? filter === "unread"
        ? and(baseCond, eq(schema.notifications.read, false))
        : and(baseCond, eq(schema.notifications.type, filter))
      : baseCond;
    const rows = await db.select().from(schema.notifications).where(cond).orderBy(desc(schema.notifications.createdAt));
    return rows as AppNotification[];
  },
  async markRead(id: string): Promise<void> {
    await db.update(schema.notifications).set({ read: true }).where(eq(schema.notifications.id, id));
  },
  async markAllRead(userId: string): Promise<void> {
    await db.update(schema.notifications).set({ read: true })
      .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.read, false)));
  },
  async unreadCount(userId: string): Promise<number> {
    const rows = await db.select({ c: count() }).from(schema.notifications)
      .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.read, false)));
    return rows[0]?.c ?? 0;
  },
};

// ───────────────────────────── 工作台统计 ─────────────────────────────
export const statsRepo = {
  async getStats(): Promise<DashboardStats> {
    const weekAgo = now() - 7 * 86400000;
    const [recentCommits] = await db.select({ c: count() }).from(schema.commits).where(sql`${schema.commits.createdAt} > ${weekAgo}`);
    const [recentMerges] = await db.select({ c: count() }).from(schema.pullRequests).where(and(eq(schema.pullRequests.status, "merged"), sql`${schema.pullRequests.updatedAt} > ${weekAgo}`));
    const [pendingReviews] = await db.select({ c: count() }).from(schema.pullRequests).where(eq(schema.pullRequests.status, "open"));
    const [totalPipelines] = await db.select({ c: count() }).from(schema.pipelines);
    const [successPipelines] = await db.select({ c: count() }).from(schema.pipelines).where(eq(schema.pipelines.status, "success"));
    const [openIssues] = await db.select({ c: count() }).from(schema.issues).where(sql`${schema.issues.status} != 'closed'`);
    const [activeRepos] = await db.select({ c: count() }).from(schema.repos);

    return {
      weeklyCommits: recentCommits?.c ?? 0,
      weeklyMerges: recentMerges?.c ?? 0,
      pendingReviews: pendingReviews?.c ?? 0,
      pipelinePassRate: totalPipelines?.c ? Math.round(((successPipelines?.c ?? 0) / totalPipelines.c) * 100) : 0,
      openIssues: openIssues?.c ?? 0,
      activeRepos: activeRepos?.c ?? 0,
    };
  },
};

// ───────────────────────────── 团队 ─────────────────────────────
export const teamRepo = {
  async getById(id: string): Promise<Team | null> {
    const rows = await db.select().from(schema.teams).where(eq(schema.teams.id, id)).limit(1);
    return (rows[0] as Team) ?? null;
  },
  async getByOwnerId(ownerId: string): Promise<Team | null> {
    const rows = await db.select().from(schema.teams).where(eq(schema.teams.ownerId, ownerId)).limit(1);
    return (rows[0] as Team) ?? null;
  },
  async create(data: { name: string; ownerId: string }): Promise<Team> {
    const id = `t${Date.now()}`;
    const ts = now();
    const row = { id, name: data.name, ownerId: data.ownerId, createdAt: ts };
    await db.insert(schema.teams).values(row);
    return row as Team;
  },
};

// ───────────────────────────── 团队成员 ─────────────────────────────
export const teamMemberRepo = {
  async listByTeam(teamId: string): Promise<TeamMember[]> {
    const rows = await db.select().from(schema.teamMembers)
      .where(eq(schema.teamMembers.teamId, teamId))
      .orderBy(asc(schema.teamMembers.joinedAt));
    return rows as TeamMember[];
  },
  async getByTeamAndUser(teamId: string, userId: string): Promise<TeamMember | null> {
    const rows = await db.select().from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId)))
      .limit(1);
    return (rows[0] as TeamMember) ?? null;
  },
  async getByUser(userId: string): Promise<TeamMember | null> {
    const rows = await db.select().from(schema.teamMembers)
      .where(eq(schema.teamMembers.userId, userId))
      .limit(1);
    return (rows[0] as TeamMember) ?? null;
  },
  async add(data: { teamId: string; userId: string; role?: TeamRole }): Promise<TeamMember> {
    const row = {
      teamId: data.teamId,
      userId: data.userId,
      role: data.role ?? "member" as TeamRole,
      joinedAt: now(),
    };
    await db.insert(schema.teamMembers).values(row);
    return row as TeamMember;
  },
  async updateRole(teamId: string, userId: string, role: TeamRole): Promise<void> {
    await db.update(schema.teamMembers).set({ role })
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId)));
  },
  async remove(teamId: string, userId: string): Promise<void> {
    await db.delete(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId)));
  },
  async count(teamId: string): Promise<number> {
    const rows = await db.select({ c: count() }).from(schema.teamMembers)
      .where(eq(schema.teamMembers.teamId, teamId));
    return rows[0]?.c ?? 0;
  },
};

// ───────────────────────────── 邀请码 ─────────────────────────────
export const inviteCodeRepo = {
  async getByCode(code: string): Promise<InviteCode | null> {
    const rows = await db.select().from(schema.inviteCodes)
      .where(eq(schema.inviteCodes.code, code)).limit(1);
    return (rows[0] as InviteCode) ?? null;
  },
  async getById(id: string): Promise<InviteCode | null> {
    const rows = await db.select().from(schema.inviteCodes)
      .where(eq(schema.inviteCodes.id, id)).limit(1);
    return (rows[0] as InviteCode) ?? null;
  },
  async listByTeam(teamId: string): Promise<InviteCode[]> {
    const rows = await db.select().from(schema.inviteCodes)
      .where(eq(schema.inviteCodes.teamId, teamId))
      .orderBy(desc(schema.inviteCodes.createdAt));
    return rows as InviteCode[];
  },
  async create(data: { teamId: string; code: string; createdBy: string; maxUses?: number; expiresAt?: number | null }): Promise<InviteCode> {
    const id = `ic${Date.now()}`;
    const row = {
      id,
      teamId: data.teamId,
      code: data.code,
      createdBy: data.createdBy,
      maxUses: data.maxUses ?? 0,
      usedCount: 0,
      expiresAt: data.expiresAt ?? null,
      createdAt: now(),
    };
    await db.insert(schema.inviteCodes).values(row);
    return row as InviteCode;
  },
  async incrementUsed(id: string): Promise<void> {
    await db.update(schema.inviteCodes)
      .set({ usedCount: sql`${schema.inviteCodes.usedCount} + 1` })
      .where(eq(schema.inviteCodes.id, id));
  },
  async delete(id: string): Promise<void> {
    await db.delete(schema.inviteCodes).where(eq(schema.inviteCodes.id, id));
  },
};

// ───────────────────────────── 协作文档 ─────────────────────────────
export const docRepo = {
  async listByTeam(teamId: string): Promise<Document[]> {
    const rows = await db.select().from(schema.documents)
      .where(eq(schema.documents.teamId, teamId))
      .orderBy(desc(schema.documents.updatedAt));
    return rows as Document[];
  },
  async getById(id: string): Promise<Document | null> {
    const rows = await db.select().from(schema.documents)
      .where(eq(schema.documents.id, id)).limit(1);
    return (rows[0] as Document) ?? null;
  },
  async create(data: { teamId: string; title: string; content?: string; language?: string; createdBy: string }): Promise<Document> {
    const id = `doc${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const ts = now();
    const row = {
      id,
      teamId: data.teamId,
      title: data.title,
      content: data.content ?? "",
      language: data.language ?? "typescript",
      createdBy: data.createdBy,
      lastEditedBy: data.createdBy,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.insert(schema.documents).values(row);
    return row as Document;
  },
  async updateContent(id: string, content: string, editorId: string): Promise<void> {
    await db.update(schema.documents)
      .set({ content, lastEditedBy: editorId, updatedAt: now() })
      .where(eq(schema.documents.id, id));
  },
  async updateTitle(id: string, title: string): Promise<void> {
    await db.update(schema.documents)
      .set({ title, updatedAt: now() })
      .where(eq(schema.documents.id, id));
  },
  async delete(id: string): Promise<void> {
    await db.delete(schema.documents).where(eq(schema.documents.id, id));
  },
};

// ───────────────────────────── 文档版本 ─────────────────────────────
export const docVersionRepo = {
  async listByDoc(docId: string, limit = 30): Promise<DocumentVersion[]> {
    const rows = await db.select().from(schema.documentVersions)
      .where(eq(schema.documentVersions.docId, docId))
      .orderBy(desc(schema.documentVersions.createdAt))
      .limit(limit);
    return rows as DocumentVersion[];
  },
  async create(data: { docId: string; content: string; authorId: string; message?: string }): Promise<DocumentVersion> {
    const id = `ver${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const row = {
      id,
      docId: data.docId,
      content: data.content,
      authorId: data.authorId,
      message: data.message ?? "",
      createdAt: now(),
    };
    await db.insert(schema.documentVersions).values(row);
    return row as DocumentVersion;
  },
  async getById(id: string): Promise<DocumentVersion | null> {
    const rows = await db.select().from(schema.documentVersions)
      .where(eq(schema.documentVersions.id, id)).limit(1);
    return (rows[0] as DocumentVersion) ?? null;
  },
};

// ───────────────────────────── 文档评论 ─────────────────────────────
export const docCommentRepo = {
  async listByDoc(docId: string): Promise<(DocumentComment & { author?: User })[]> {
    const rows = await db.select().from(schema.documentComments)
      .where(eq(schema.documentComments.docId, docId))
      .orderBy(asc(schema.documentComments.createdAt));
    const comments = rows as DocumentComment[];
    const authors = await Promise.all(
      comments.map((c) => userRepo.getById(c.authorId)),
    );
    return comments.map((c, i) => ({ ...c, author: authors[i] ?? undefined }));
  },
  async create(data: { docId: string; authorId: string; body: string; lineNumber?: number | null }): Promise<DocumentComment> {
    const id = `dc${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const row = {
      id,
      docId: data.docId,
      authorId: data.authorId,
      body: data.body,
      lineNumber: data.lineNumber ?? null,
      resolved: false,
      createdAt: now(),
    };
    await db.insert(schema.documentComments).values(row);
    return row as DocumentComment;
  },
  async resolve(id: string, resolved: boolean): Promise<void> {
    await db.update(schema.documentComments)
      .set({ resolved })
      .where(eq(schema.documentComments.id, id));
  },
  async delete(id: string): Promise<void> {
    await db.delete(schema.documentComments).where(eq(schema.documentComments.id, id));
  },
};
