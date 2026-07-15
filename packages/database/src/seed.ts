/**
 * CodeZone · 数据库种子脚本
 *
 * 将原 mock 种子数据 (apps/api/src/db/seed.ts) 完整迁移至 PostgreSQL。
 * 幂等: 每张表先按主键探测是否已有数据, 有则跳过。
 *
 * 运行: pnpm db:seed  (tsx src/seed.ts)
 */
import "dotenv/config";
import { db, schema } from "./client.js";
import { eq } from "drizzle-orm";
import bcryptjs from "bcryptjs";

// ───────────────────────── 时间常量 ─────────────────────────
const now = Date.now();
const day = 86400000;
const hour = 3600000;

// ───────────────────────── 种子密码 ─────────────────────────
// 所有种子用户统一使用该密码
const SEED_PASSWORD = "codezone123";
const passwordHash = bcryptjs.hashSync(SEED_PASSWORD, 10);

// ───────────────────────── 数据: 标签 ─────────────────────────
// 原 mock 为全局共享标签; schema 中 labels 需 repoId,
// 这里将其锚定到核心仓库 r1 (团队共享词表)。
const labels = [
  { id: "l1", repoId: "r1", name: "bug", color: "#a64953" },
  { id: "l2", repoId: "r1", name: "enhancement", color: "#5e9f7e" },
  { id: "l3", repoId: "r1", name: "feature", color: "#33a6b8" },
  { id: "l4", repoId: "r1", name: "docs", color: "#3d6896" },
  { id: "l5", repoId: "r1", name: "performance", color: "#a87a3d" },
  { id: "l6", repoId: "r1", name: "refactor", color: "#787670" },
  { id: "l7", repoId: "r1", name: "good first issue", color: "#5e9f7e" },
  { id: "l8", repoId: "r1", name: "wontfix", color: "#a8a69f" },
];

// 议题内联引用的标签对象 (jsonb, 自包含)
const L = {
  bug: { id: "l1", name: "bug", color: "#a64953" },
  enhancement: { id: "l2", name: "enhancement", color: "#5e9f7e" },
  feature: { id: "l3", name: "feature", color: "#33a6b8" },
  docs: { id: "l4", name: "docs", color: "#3d6896" },
  performance: { id: "l5", name: "performance", color: "#a87a3d" },
  refactor: { id: "l6", name: "refactor", color: "#787670" },
};

// ───────────────────────── 数据: 用户 ─────────────────────────
const users = [
  { id: "u1", name: "林知白", email: "lin@codezone.dev", avatar: "", role: "admin", createdAt: now - 180 * day, passwordHash },
  { id: "u2", name: "陈砚秋", email: "chen@codezone.dev", avatar: "", role: "maintainer", createdAt: now - 160 * day, passwordHash },
  { id: "u3", name: "苏映雪", email: "su@codezone.dev", avatar: "", role: "maintainer", createdAt: now - 120 * day, passwordHash },
  { id: "u4", name: "周时砚", email: "zhou@codezone.dev", avatar: "", role: "member", createdAt: now - 90 * day, passwordHash },
  { id: "u5", name: "顾长青", email: "gu@codezone.dev", avatar: "", role: "member", createdAt: now - 60 * day, passwordHash },
  { id: "u6", name: "沈听澜", email: "shen@codezone.dev", avatar: "", role: "member", createdAt: now - 30 * day, passwordHash },
];

// ───────────────────────── 数据: 仓库 ─────────────────────────
const repos = [
  {
    id: "r1", name: "codezone-core", description: "CodeZone 协作平台核心服务 — 议题、PR、流水线引擎",
    language: "TypeScript", languageColor: "#3178c6", stars: 248, defaultBranch: "main",
    ownerId: "u1", updatedAt: now - 2 * hour,
  },
  {
    id: "r2", name: "codezone-web", description: "CodeZone 前端应用 — React + Vite + Yohaku 设计系统",
    language: "TypeScript", languageColor: "#3178c6", stars: 186, defaultBranch: "main",
    ownerId: "u2", updatedAt: now - 5 * hour,
  },
  {
    id: "r3", name: "codezone-cli", description: "CodeZone 命令行工具 — 终端内的代码评审与议题管理",
    language: "Go", languageColor: "#00ADD8", stars: 94, defaultBranch: "main",
    ownerId: "u3", updatedAt: now - 1 * day,
  },
  {
    id: "r4", name: "design-tokens", description: "Yohaku 设计令牌库 — 颜色、字体、间距的可移植契约",
    language: "CSS", languageColor: "#563d7c", stars: 72, defaultBranch: "main",
    ownerId: "u1", updatedAt: now - 3 * day,
  },
  {
    id: "r5", name: "codezone-docs", description: "CodeZone 官方文档与知识库 — 使用指南、API 参考、最佳实践",
    language: "MDX", languageColor: "#fcb32c", stars: 58, defaultBranch: "main",
    ownerId: "u4", updatedAt: now - 6 * hour,
  },
];

// ───────────────────────── 数据: 议题 ─────────────────────────
const issues = [
  {
    id: "i1", repoId: "r1", number: 142, title: "议题看板拖拽在 Safari 下偶发丢失目标列",
    body: "在 Safari 16+ 中，将议题卡片从「进行中」拖至「评审中」时，约 20% 概率 drop 事件不触发，卡片回到原列。\n\n复现步骤：\n1. 打开看板视图\n2. 拖拽任意卡片跨列\n3. 反复操作 5 次以上\n\n预期：卡片稳定落入目标列。\n实际：偶发回弹。",
    status: "in_progress", priority: "high", assigneeId: "u2",
    labels: [L.bug, L.refactor], milestone: "v2.4", createdAt: now - 3 * day, updatedAt: now - 4 * hour,
  },
  {
    id: "i2", repoId: "r1", number: 141, title: "活动流聚合查询在万条记录后明显变慢",
    body: "当 activities 表超过 1 万行，首页活动流首屏加载从 120ms 升至 900ms。需要引入游标分页与索引优化。",
    status: "open", priority: "high", assigneeId: "u3",
    labels: [L.performance], milestone: "v2.4", createdAt: now - 5 * day, updatedAt: now - 1 * day,
  },
  {
    id: "i3", repoId: "r1", number: 140, title: "支持议题批量编辑标签与里程碑",
    body: "在议题列表多选后，应能一次性修改标签、里程碑与指派人，避免逐条点击。",
    status: "open", priority: "normal", assigneeId: null,
    labels: [L.feature], milestone: null, createdAt: now - 7 * day, updatedAt: now - 7 * day,
  },
  {
    id: "i4", repoId: "r2", number: 88, title: "深色模式下代码 Diff 增删行对比度不足",
    body: "深色主题中，删除行背景过暗，与上下文行难以区分。建议提升删除行背景亮度至 neutral-3 层级。",
    status: "review", priority: "normal", assigneeId: "u4",
    labels: [L.bug, L.enhancement], milestone: "v2.4", createdAt: now - 2 * day, updatedAt: now - 6 * hour,
  },
  {
    id: "i5", repoId: "r2", number: 87, title: "PR Diff 视图增加分屏模式",
    body: "当前 Diff 仅支持统一视图，评审长文件时上下文跳跃。增加左右分屏（旧/新）切换。",
    status: "open", priority: "normal", assigneeId: "u5",
    labels: [L.feature], milestone: "v2.5", createdAt: now - 4 * day, updatedAt: now - 2 * day,
  },
  {
    id: "i6", repoId: "r3", number: 31, title: "CLI 安装命令在 Windows PowerShell 下路径解析异常",
    body: "`cz install` 在 PowerShell 7 中将反斜杠吞掉，导致全局命令注册失败。",
    status: "open", priority: "high", assigneeId: "u6",
    labels: [L.bug], milestone: null, createdAt: now - 6 * day, updatedAt: now - 6 * day,
  },
  {
    id: "i7", repoId: "r1", number: 139, title: "流水线日志支持搜索与高亮",
    body: "长日志（>5000 行）难以定位失败原因。增加关键字搜索、错误行高亮与折叠。",
    status: "open", priority: "normal", assigneeId: null,
    labels: [L.feature, L.enhancement], milestone: "v2.5", createdAt: now - 8 * day, updatedAt: now - 8 * day,
  },
  {
    id: "i8", repoId: "r4", number: 12, title: "补充深色主题中性灰反转规范文档",
    body: "Yohaku 深色模式将 neutral-1~10 反转为纯灰，需在 CHEATSHEET 中补充说明与示例。",
    status: "closed", priority: "low", assigneeId: "u1",
    labels: [L.docs], milestone: null, createdAt: now - 14 * day, updatedAt: now - 10 * day,
  },
  {
    id: "i9", repoId: "r5", number: 24, title: "文档站搜索功能无法匹配中文分词",
    body: "全文搜索对中文按空格切分，导致「议题看板」无法命中。需接入 CJK 分词。",
    status: "open", priority: "normal", assigneeId: "u4",
    labels: [L.bug, L.docs], milestone: "v2.5", createdAt: now - 9 * day, updatedAt: now - 9 * day,
  },
  {
    id: "i10", repoId: "r2", number: 86, title: "优化首屏 LCP，将字体加载移至关键路径外",
    body: "Noto Serif SC 全量加载阻塞 LCP。改为按字重子集化 + font-display: swap。",
    status: "closed", priority: "high", assigneeId: "u2",
    labels: [L.performance], milestone: "v2.3", createdAt: now - 18 * day, updatedAt: now - 12 * day,
  },
];

// ───────────────────────── 数据: 合并请求 ─────────────────────────
const pullRequests = [
  {
    id: "p1", repoId: "r1", number: 67, title: "feat(issues): 看板拖拽 Safari 兼容性修复",
    body: "修复 #142。在 Safari 下使用 `pointer-events` + `dragend` 兜底，确保 drop 目标列稳定识别。\n\n变更：\n- 新增 `useDropFallback` hook\n- 看板列增加 `data-column` 属性\n- 增加 Safari 16 e2e 测试",
    status: "open", authorId: "u2", sourceBranch: "fix/kanban-safari-dnd", targetBranch: "main",
    additions: 84, deletions: 12, changedFiles: 4,
    checks: [
      { name: "lint", status: "success" },
      { name: "unit-test", status: "success" },
      { name: "e2e-safari", status: "pending" },
    ],
    reviewers: ["u3", "u1"], createdAt: now - 4 * hour, updatedAt: now - 1 * hour,
    files: [
      {
        path: "src/board/KanbanColumn.tsx", status: "modified", additions: 24, deletions: 6,
        hunks: [{
          oldStart: 18, newStart: 18,
          lines: [
            { type: "context", oldNumber: 18, newNumber: 18, content: "export function KanbanColumn({ id, title, cards }: Props) {" },
            { type: "context", oldNumber: 19, newNumber: 19, content: "  const [isOver, setIsOver] = useState(false)" },
            { type: "remove", oldNumber: 20, newNumber: null, content: "  return (" },
            { type: "add", oldNumber: null, newNumber: 20, content: "  const handleDragEnd = useDropFallback(id)" },
            { type: "add", oldNumber: null, newNumber: 21, content: "  return (" },
            { type: "context", oldNumber: 21, newNumber: 22, content: "    <div data-column={id} onDragOver={onDragOver}>" },
          ],
        }],
      },
      {
        path: "src/board/useDropFallback.ts", status: "added", additions: 42, deletions: 0,
        hunks: [{
          oldStart: 0, newStart: 1,
          lines: [
            { type: "add", oldNumber: null, newNumber: 1, content: "import { useRef } from 'react'" },
            { type: "add", oldNumber: null, newNumber: 2, content: "" },
            { type: "add", oldNumber: null, newNumber: 3, content: "// Safari 16+ pointer-events 降级: dragend 兜底定位目标列" },
            { type: "add", oldNumber: null, newNumber: 4, content: "export function useDropFallback(columnId: string) {" },
            { type: "add", oldNumber: null, newNumber: 5, content: "  const ref = useRef(columnId)" },
            { type: "add", oldNumber: null, newNumber: 6, content: "  return useCallback(() => ref.current, [columnId])" },
            { type: "add", oldNumber: null, newNumber: 7, content: "}" },
          ],
        }],
      },
    ],
  },
  {
    id: "p2", repoId: "r1", number: 66, title: "perf(activity): 活动流游标分页与复合索引",
    body: "修复 #141。引入 `created_at + id` 游标分页，复合索引 `(repo_id, created_at DESC)`。万条记录首屏从 900ms 降至 80ms。",
    status: "open", authorId: "u3", sourceBranch: "perf/activity-cursor", targetBranch: "main",
    additions: 142, deletions: 38, changedFiles: 6,
    checks: [
      { name: "lint", status: "success" },
      { name: "unit-test", status: "success" },
      { name: "migration-check", status: "success" },
    ],
    reviewers: ["u1"], createdAt: now - 8 * hour, updatedAt: now - 3 * hour,
    files: [
      {
        path: "api/services/activity.ts", status: "modified", additions: 58, deletions: 24,
        hunks: [{
          oldStart: 12, newStart: 12,
          lines: [
            { type: "context", oldNumber: 12, newNumber: 12, content: "export async function listActivities(opts: QueryOpts) {" },
            { type: "remove", oldNumber: 13, newNumber: null, content: "  return db.prepare('SELECT * FROM activities ORDER BY created_at DESC LIMIT ?').all(opts.limit)" },
            { type: "add", oldNumber: null, newNumber: 13, content: "  const cursor = opts.cursor ? decodeCursor(opts.cursor) : null" },
            { type: "add", oldNumber: null, newNumber: 14, content: "  const rows = db.prepare(CURSOR_SQL).all(opts.repoId, cursor?.createdAt ?? Number.MAX_SAFE_INTEGER, opts.limit)" },
            { type: "add", oldNumber: null, newNumber: 15, content: "  return { items: rows, nextCursor: encodeCursor(rows.at(-1)) }" },
          ],
        }],
      },
    ],
  },
  {
    id: "p3", repoId: "r2", number: 54, title: "feat(diff): 深色模式增删行对比度优化",
    body: "修复 #88。深色主题删除行背景由 neutral-1 提升至 neutral-3，新增行保留 accent-soft，对比度达 WCAG AA。",
    status: "open", authorId: "u4", sourceBranch: "fix/diff-dark-contrast", targetBranch: "main",
    additions: 18, deletions: 14, changedFiles: 2,
    checks: [
      { name: "lint", status: "success" },
      { name: "a11y-contrast", status: "success" },
    ],
    reviewers: ["u2"], createdAt: now - 6 * hour, updatedAt: now - 2 * hour,
    files: [
      {
        path: "src/components/diff/DiffViewer.tsx", status: "modified", additions: 10, deletions: 8,
        hunks: [{
          oldStart: 34, newStart: 34,
          lines: [
            { type: "context", oldNumber: 34, newNumber: 34, content: "  const lineClass = {" },
            { type: "remove", oldNumber: 35, newNumber: null, content: "    add: 'bg-[var(--color-accent-soft)]'," },
            { type: "remove", oldNumber: 36, newNumber: null, content: "    remove: 'bg-neutral-1 opacity-60'," },
            { type: "add", oldNumber: null, newNumber: 35, content: "    add: 'bg-[var(--color-accent-soft)]'," },
            { type: "add", oldNumber: null, newNumber: 36, content: "    remove: 'bg-neutral-3 dark:bg-[var(--neutral-3)]'," },
          ],
        }],
      },
    ],
  },
  {
    id: "p4", repoId: "r5", number: 19, title: "feat(search): CJK 分词接入",
    body: "修复 #24。文档搜索接入 `jieba-wasm`，中文按词切分。「议题看板」现可命中。",
    status: "draft", authorId: "u4", sourceBranch: "feat/cjk-search", targetBranch: "main",
    additions: 128, deletions: 22, changedFiles: 5,
    checks: [{ name: "lint", status: "pending" }],
    reviewers: [], createdAt: now - 3 * day, updatedAt: now - 1 * day,
    files: [],
  },
];

// ───────────────────────── 数据: 提交 ─────────────────────────
const commits = [
  { id: "c1", repoId: "r1", sha: "a3f8c2d1e9b04f7c", message: "feat(issues): 看板拖拽增加 DataTransfer 降级处理", authorId: "u2", additions: 84, deletions: 12, createdAt: now - 4 * hour },
  { id: "c2", repoId: "r1", sha: "b7e1d4c8a02f5936", message: "perf(activity): 活动流查询引入游标分页与复合索引", authorId: "u3", additions: 142, deletions: 38, createdAt: now - 8 * hour },
  { id: "c3", repoId: "r1", sha: "c9d2a7f1048be521", message: "fix(pipeline): 日志聚合截断超长输出", authorId: "u2", additions: 26, deletions: 9, createdAt: now - 1 * day },
  { id: "c4", repoId: "r2", sha: "d1e8b3c6059a7f24", message: "feat(diff): 深色模式删除行背景提升至 neutral-3", authorId: "u4", additions: 18, deletions: 14, createdAt: now - 6 * hour },
  { id: "c5", repoId: "r2", sha: "e2a9c7b1046d8f53", message: "refactor(theme): CSS 变量分层, 消除闪烁过渡", authorId: "u2", additions: 96, deletions: 71, createdAt: now - 1 * day },
  { id: "c6", repoId: "r2", sha: "f3b1d8a2097ce46b", message: "docs: 补充 Yohaku 令牌迁移指南", authorId: "u4", additions: 212, deletions: 4, createdAt: now - 2 * day },
  { id: "c7", repoId: "r3", sha: "a4c2e9b1083df576", message: "fix(cli): PowerShell 路径解析使用 ForwardSlash", authorId: "u6", additions: 34, deletions: 11, createdAt: now - 1 * day },
  { id: "c8", repoId: "r5", sha: "b5d3f1c2097ea864", message: "feat(search): 接入 CJK 分词提升中文命中率", authorId: "u4", additions: 128, deletions: 22, createdAt: now - 3 * day },
];

// ───────────────────────── 数据: 评论 ─────────────────────────
const comments = [
  { id: "cm1", targetType: "pull", targetId: "p1", authorId: "u3", body: "useDropFallback 的 ref 其实可以直接用 columnId 闭包捕获，不需要 useRef。其余 LGTM。", lineNumber: null, createdAt: now - 3 * hour },
  { id: "cm2", targetType: "pull", targetId: "p1", authorId: "u2", body: "确实，已简化。感谢指正。", lineNumber: null, createdAt: now - 2 * hour },
  { id: "cm3", targetType: "pull", targetId: "p1", authorId: "u1", body: "e2e-safari 通过后即可合并。", lineNumber: null, createdAt: now - 1 * hour },
  { id: "cm4", targetType: "pull", targetId: "p2", authorId: "u1", body: "游标编码用 base64 即可，不必引入额外依赖。性能提升显著，赞。", lineNumber: null, createdAt: now - 5 * hour },
  { id: "cm5", targetType: "pull", targetId: "p2", authorId: "u3", body: "已改为 base64。", lineNumber: null, createdAt: now - 4 * hour },
  { id: "cm6", targetType: "pull", targetId: "p3", authorId: "u2", body: "删除行背景提升后对比度达标，批准。", lineNumber: null, createdAt: now - 2 * hour },
];

// ───────────────────────── 数据: 流水线 ─────────────────────────
const pipelines = [
  {
    id: "pl1", repoId: "r1", commitSha: "a3f8c2d1e9b04f7c", commitMessage: "feat(issues): 看板拖拽增加 DataTransfer 降级处理",
    status: "success", trigger: "push", authorId: "u2", branch: "fix/kanban-safari-dnd",
    createdAt: now - 4 * hour, durationMs: 184000,
    stages: [
      { id: "s1", name: "install", status: "success", durationMs: 42000, log: "pnpm install --frozen-lockfile\nDone in 41.8s" },
      { id: "s2", name: "lint", status: "success", durationMs: 12000, log: "eslint .\n✔ No problems found" },
      { id: "s3", name: "build", status: "success", durationMs: 68000, log: "tsc -b && vite build\n✓ built in 67.4s" },
      { id: "s4", name: "test", status: "success", durationMs: 62000, log: "vitest run\nTest Files  48 passed\nTests       312 passed" },
    ],
  },
  {
    id: "pl2", repoId: "r1", commitSha: "b7e1d4c8a02f5936", commitMessage: "perf(activity): 活动流查询引入游标分页与复合索引",
    status: "running", trigger: "push", authorId: "u3", branch: "perf/activity-cursor",
    createdAt: now - 8 * hour, durationMs: 0,
    stages: [
      { id: "s5", name: "install", status: "success", durationMs: 44000, log: "Done in 43.2s" },
      { id: "s6", name: "lint", status: "success", durationMs: 11000, log: "✔ No problems found" },
      { id: "s7", name: "build", status: "success", durationMs: 71000, log: "✓ built in 70.1s" },
      { id: "s8", name: "test", status: "running", durationMs: 0, log: "vitest run\nTest Files  12 passed\nTests       88 passed\n..." },
    ],
  },
  {
    id: "pl3", repoId: "r2", commitSha: "d1e8b3c6059a7f24", commitMessage: "feat(diff): 深色模式删除行背景提升至 neutral-3",
    status: "failed", trigger: "push", authorId: "u4", branch: "fix/diff-dark-contrast",
    createdAt: now - 6 * hour, durationMs: 96000,
    stages: [
      { id: "s9", name: "install", status: "success", durationMs: 38000, log: "Done in 37.6s" },
      { id: "s10", name: "lint", status: "success", durationMs: 9000, log: "✔ No problems found" },
      { id: "s11", name: "a11y-contrast", status: "failed", durationMs: 49000, log: "axe-core\nFAIL: remove line contrast 3.8:1 (expected ≥ 4.5:1)\n  at DiffViewer.tsx:36\n1 failing check" },
    ],
  },
  {
    id: "pl4", repoId: "r3", commitSha: "a4c2e9b1083df576", commitMessage: "fix(cli): PowerShell 路径解析使用 ForwardSlash",
    status: "success", trigger: "push", authorId: "u6", branch: "fix/powershell-path",
    createdAt: now - 1 * day, durationMs: 124000,
    stages: [
      { id: "s12", name: "build", status: "success", durationMs: 58000, log: "go build ./...\n✓ build complete" },
      { id: "s13", name: "test", status: "success", durationMs: 66000, log: "go test ./...\nok  codezone/cli  0.84s" },
    ],
  },
];

// ───────────────────────── 数据: 讨论 ─────────────────────────
const discussions = [
  {
    id: "d1", repoId: "r1", title: "v2.4 发布前的最终议题清单与负责人", category: "公告",
    authorId: "u1", body: "距 v2.4 发布还有一周，请在周五前完成各自负责议题的评审与合并。\n\n- @陈砚秋 #142 看板拖拽\n- @苏映雪 #141 活动流性能\n- @周时砚 #88 Diff 对比度",
    pinned: true, replyCount: 12, createdAt: now - 2 * day, updatedAt: now - 1 * hour,
  },
  {
    id: "d2", repoId: "r1", title: "是否引入 tRPC 替代手写 REST 路由？", category: "架构",
    authorId: "u3", body: "随着端点增多，类型同步成本上升。tRPC 可让前后端共享类型，但会加深对 TanStack 生态的耦合。大家怎么看？",
    pinned: false, replyCount: 8, createdAt: now - 5 * day, updatedAt: now - 2 * day,
  },
  {
    id: "d3", repoId: "r2", title: "Yohaku 令牌迁移: neutral-50~950 全部清除进度", category: "重构",
    authorId: "u2", body: "按 Yohaku 契约，Tailwind 默认 neutral-50~950 全部禁用。目前 web 仓库已清除 87%，剩余 13 个文件待处理。",
    pinned: false, replyCount: 4, createdAt: now - 6 * day, updatedAt: now - 3 * day,
  },
  {
    id: "d4", repoId: "r4", title: "深色模式中性灰反转规范的措辞建议", category: "文档",
    authorId: "u1", body: "CHEATSHEET 中「深色模式自动反转」表述不够精确，建议改为「深色模式重置为纯中性灰 (R=G=B)，暖意仅由 --color-paper 承载」。",
    pinned: false, replyCount: 3, createdAt: now - 10 * day, updatedAt: now - 8 * day,
  },
];

// ───────────────────────── 数据: 活动 ─────────────────────────
const activities = [
  { id: "a1", type: "pull_request", actorId: "u2", repoId: "r1", description: "提交了合并请求 #67 看板拖拽 Safari 兼容性修复", createdAt: now - 4 * hour },
  { id: "a2", type: "comment", actorId: "u3", repoId: "r1", description: "在 PR #67 中发表了评审意见", createdAt: now - 3 * hour },
  { id: "a3", type: "commit", actorId: "u2", repoId: "r1", description: "推送了提交 a3f8c2d 看板拖拽增加 DataTransfer 降级处理", createdAt: now - 4 * hour },
  { id: "a4", type: "pipeline", actorId: "u2", repoId: "r1", description: "流水线 #pl1 运行成功 · 耗时 3m4s", createdAt: now - 3.5 * hour },
  { id: "a5", type: "pull_request", actorId: "u3", repoId: "r1", description: "提交了合并请求 #66 活动流游标分页与复合索引", createdAt: now - 8 * hour },
  { id: "a6", type: "issue", actorId: "u4", repoId: "r2", description: "创建了议题 #88 深色模式下代码 Diff 增删行对比度不足", createdAt: now - 2 * day },
  { id: "a7", type: "pull_request", actorId: "u4", repoId: "r2", description: "提交了合并请求 #54 深色模式增删行对比度优化", createdAt: now - 6 * hour },
  { id: "a8", type: "pipeline", actorId: "u4", repoId: "r2", description: "流水线 #pl3 运行失败 · a11y-contrast 未通过", createdAt: now - 5 * hour },
  { id: "a9", type: "merge", actorId: "u1", repoId: "r5", description: "合并了 PR #18 文档站搜索接入", createdAt: now - 3 * day },
  { id: "a10", type: "commit", actorId: "u6", repoId: "r3", description: "推送了提交 a4c2e9 PowerShell 路径解析", createdAt: now - 1 * day },
  { id: "a11", type: "issue", actorId: "u3", repoId: "r1", description: "关闭了议题 #139 流水线日志搜索", createdAt: now - 1 * day },
  { id: "a12", type: "comment", actorId: "u1", repoId: "r1", description: "在讨论「v2.4 发布清单」中回复", createdAt: now - 1 * hour },
];

// ───────────────────────── 数据: 文件树 ─────────────────────────
const fileTrees = [
  {
    repoId: "r1",
    nodes: [
      {
        name: "src", path: "src", type: "dir",
        children: [
          {
            name: "services", path: "src/services", type: "dir",
            children: [
              {
                name: "activity.ts", path: "src/services/activity.ts", type: "file", language: "typescript",
                content: "import { db } from '../db'\nimport type { Activity } from '@shared/types'\n\nexport async function listActivities(opts: {\n  repoId?: string\n  cursor?: string\n  limit?: number\n}) {\n  const limit = opts.limit ?? 20\n  const cursor = opts.cursor ? decodeCursor(opts.cursor) : null\n  const rows = db\n    .prepare(CURSOR_SQL)\n    .all(opts.repoId ?? null, cursor?.createdAt ?? Number.MAX_SAFE_INTEGER, limit)\n  return { items: rows as Activity[], nextCursor: encodeCursor(rows.at(-1)) }\n}\n\nconst CURSOR_SQL = `\n  SELECT * FROM activities\n  WHERE (repo_id = ? OR ? IS NULL)\n    AND created_at < ?\n  ORDER BY created_at DESC, id DESC\n  LIMIT ?\n`\n\nfunction encodeCursor(row: unknown): string | null {\n  if (!row) return null\n  return Buffer.from(JSON.stringify({ createdAt: (row as any).createdAt })).toString('base64')\n}\n\nfunction decodeCursor(raw: string): { createdAt: number } {\n  return JSON.parse(Buffer.from(raw, 'base64').toString())\n}\n",
              },
              {
                name: "issue.ts", path: "src/services/issue.ts", type: "file", language: "typescript",
                content: "import { db } from '../db'\nimport type { Issue } from '@shared/types'\n\nexport function listIssues(repoId: string, filters?: { status?: string }) {\n  const status = filters?.status\n  if (status) {\n    return db.prepare('SELECT * FROM issues WHERE repo_id = ? AND status = ? ORDER BY number DESC').all(repoId, status) as Issue[]\n  }\n  return db.prepare('SELECT * FROM issues WHERE repo_id = ? ORDER BY number DESC').all(repoId) as Issue[]\n}\n\nexport function updateIssueStatus(id: string, status: string) {\n  db.prepare('UPDATE issues SET status = ?, updated_at = ? WHERE id = ?').run(status, Date.now(), id)\n}\n",
              },
            ],
          },
          {
            name: "board", path: "src/board", type: "dir",
            children: [
              {
                name: "KanbanColumn.tsx", path: "src/board/KanbanColumn.tsx", type: "file", language: "tsx",
                content: "import { useState } from 'react'\nimport type { Issue } from '@shared/types'\nimport { useDropFallback } from './useDropFallback'\n\ninterface Props {\n  id: string\n  title: string\n  cards: Issue[]\n  onDrop: (issueId: string, column: string) => void\n}\n\nexport function KanbanColumn({ id, title, cards, onDrop }: Props) {\n  const [isOver, setIsOver] = useState(false)\n  const handleDragEnd = useDropFallback(id)\n\n  return (\n    <div\n      data-column={id}\n      onDragOver={(e) => { e.preventDefault(); setIsOver(true) }}\n      onDragLeave={() => setIsOver(false)}\n      onDrop={(e) => {\n        e.preventDefault()\n        const issueId = e.dataTransfer.getData('text/plain')\n        onDrop(issueId, id)\n        setIsOver(false)\n      }}\n    >\n      <h3>{title}</h3>\n      {cards.map((c) => (\n        <Card key={c.id} issue={c} />\n      ))}\n    </div>\n  )\n}\n",
              },
              {
                name: "useDropFallback.ts", path: "src/board/useDropFallback.ts", type: "file", language: "typescript",
                content: "import { useCallback } from 'react'\n\n// Safari 16+ pointer-events 降级: dragend 兜底定位目标列\nexport function useDropFallback(columnId: string) {\n  return useCallback(() => columnId, [columnId])\n}\n",
              },
            ],
          },
        ],
      },
      {
        name: "README.md", path: "README.md", type: "file", language: "markdown",
        content: "# codezone-core\n\nCodeZone 协作平台核心服务 — 议题、PR、流水线引擎。\n\n## 快速开始\n\n```bash\npnpm install\npnpm dev\n```\n\n## 架构\n\n- **Controller**: 参数校验与响应\n- **Service**: 业务编排\n- **Repository**: SQL 访问层\n\n## 许可\n\nMIT\n",
      },
      {
        name: "package.json", path: "package.json", type: "file", language: "json",
        content: "{\n  \"name\": \"codezone-core\",\n  \"version\": \"2.4.0-beta\",\n  \"type\": \"module\",\n  \"scripts\": {\n    \"dev\": \"tsx watch api/server.ts\",\n    \"build\": \"tsc -b\",\n    \"test\": \"vitest run\"\n  }\n}\n",
      },
    ],
  },
  {
    repoId: "r2",
    nodes: [
      {
        name: "src", path: "src", type: "dir",
        children: [
          {
            name: "components", path: "src/components", type: "dir",
            children: [
              {
                name: "diff", path: "src/components/diff", type: "dir",
                children: [
                  {
                    name: "DiffViewer.tsx", path: "src/components/diff/DiffViewer.tsx", type: "file", language: "tsx",
                    content: "import type { DiffLine } from '@shared/types'\n\nexport function DiffViewer({ lines }: { lines: DiffLine[] }) {\n  const lineClass = {\n    add: 'bg-[var(--color-accent-soft)]',\n    remove: 'bg-neutral-3 dark:bg-[var(--neutral-3)]',\n    context: '',\n  }\n  return (\n    <pre className=\"font-mono text-copy-13\">\n      {lines.map((line, i) => (\n        <div key={i} className={lineClass[line.type]}>\n          <span className=\"select-none opacity-40 w-8 inline-block\">\n            {line.newNumber ?? ' '}\n          </span>\n          <span>{line.content}</span>\n        </div>\n      ))}\n    </pre>\n  )\n}\n",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "README.md", path: "README.md", type: "file", language: "markdown",
        content: "# codezone-web\n\nCodeZone 前端应用，采用 Yohaku 设计系统。\n\n> 留白也是写作的一部分。\n\n## 技术栈\n\n- React 18 + TypeScript\n- Vite + Tailwind CSS\n- Yohaku Design System\n",
      },
    ],
  },
];

// ───────────────────────── 数据: 里程碑 ─────────────────────────
// 源自 apps/api/src/routes/milestones.ts
const milestones = [
  {
    id: "m1", repoId: "r1", title: "v2.4 发布",
    description: "看板拖拽稳定性、活动流性能优化、深色模式对比度修复。聚焦于评审体验的打磨。",
    dueDate: now + 3 * day, status: "open", progress: 68,
    openIssues: 4, closedIssues: 9, totalIssues: 13,
  },
  {
    id: "m2", repoId: "r1", title: "v2.5 规划",
    description: "PR 分屏 Diff、议题批量编辑、流水线日志搜索。下一阶段的能力扩展。",
    dueDate: now + 35 * day, status: "open", progress: 12,
    openIssues: 7, closedIssues: 1, totalIssues: 8,
  },
  {
    id: "m3", repoId: "r2", title: "性能优化冲刺",
    description: "首屏 LCP 优化、字体子集化、长列表虚拟滚动。",
    dueDate: now + 1 * day, status: "open", progress: 90,
    openIssues: 1, closedIssues: 9, totalIssues: 10,
  },
  {
    id: "m4", repoId: "r4", title: "文档完善",
    description: "Yohaku 设计令牌迁移指南、深色模式规范、CHEATSHEET 更新。",
    dueDate: now - 5 * day, status: "closed", progress: 100,
    openIssues: 0, closedIssues: 6, totalIssues: 6,
  },
  {
    id: "m5", repoId: "r2", title: "移动端适配",
    description: "响应式布局重构、触摸交互优化、PWA 支持。",
    dueDate: now + 60 * day, status: "open", progress: 5,
    openIssues: 8, closedIssues: 0, totalIssues: 8,
  },
];

// ───────────────────────── 数据: 通知 ─────────────────────────
// 源自 apps/web/src/pages/Notifications.tsx, userId = "u1" (林知白)
// actorName → actorId: 陈砚秋=u2, 苏映雪=u3, 周时砚=u4, 顾长青=u5, 沈听澜=u6, CI 机器人=null
const notifications = [
  {
    id: "n1", userId: "u1", type: "review",
    title: "陈砚秋 请求你评审 PR #142",
    body: "feat: 议题看板支持批量编辑标签与里程碑 — codezone-core",
    read: false, actorId: "u2", targetType: "pull", targetId: null, createdAt: now - 0.5 * hour,
  },
  {
    id: "n2", userId: "u1", type: "mention",
    title: "苏映雪 在 PR #88 中提到了你",
    body: "@林知白 这块深色模式对比度的处理方案，想听听你的意见。",
    read: false, actorId: "u3", targetType: "pull", targetId: null, createdAt: now - 2 * hour,
  },
  {
    id: "n3", userId: "u1", type: "assign",
    title: "周时砚 将议题 #140 指派给你",
    body: "支持议题批量编辑标签与里程碑 — codezone-core",
    read: false, actorId: "u4", targetType: "issue", targetId: null, createdAt: now - 5 * hour,
  },
  {
    id: "n4", userId: "u1", type: "ci",
    title: "流水线通过 · codezone-web",
    body: "main 分支 #1287 全部检查通过，耗时 3m12s。",
    read: true, actorId: null, targetType: "pipeline", targetId: null, createdAt: now - 8 * hour,
  },
  {
    id: "n5", userId: "u1", type: "ci",
    title: "流水线失败 · codezone-cli",
    body: "main 分支 #418 在「测试」阶段失败，请查看日志定位原因。",
    read: false, actorId: null, targetType: "pipeline", targetId: null, createdAt: now - 12 * hour,
  },
  {
    id: "n6", userId: "u1", type: "follow",
    title: "顾长青 关注了你",
    body: "你们有 3 个共同协作的仓库，或许可以打个招呼。",
    read: true, actorId: "u5", targetType: null, targetId: null, createdAt: now - 1 * day,
  },
  {
    id: "n7", userId: "u1", type: "review",
    title: "沈听澜 在 PR #142 上留下了评审评论",
    body: "建议将批量操作抽成独立 hook，便于后续在议题列表中复用。",
    read: true, actorId: "u6", targetType: "pull", targetId: null, createdAt: now - 1.5 * day,
  },
  {
    id: "n8", userId: "u1", type: "mention",
    title: "陈砚秋 在议题 #139 中提到了你",
    body: "@林知白 日志搜索这块你之前做过类似实现，能否复用部分逻辑？",
    read: true, actorId: "u2", targetType: "issue", targetId: null, createdAt: now - 2 * day,
  },
  {
    id: "n9", userId: "u1", type: "assign",
    title: "苏映雪 将议题 #141 指派给你",
    body: "活动流聚合查询在万条记录后明显变慢 — codezone-core",
    read: true, actorId: "u3", targetType: "issue", targetId: null, createdAt: now - 3 * day,
  },
];

// ───────────────────────── 幂等插入 ─────────────────────────
/**
 * 按主键探测某条记录是否已存在, 用于实现幂等。
 * @param table  schema 表对象
 * @param col    探测列 (通常为主键)
 * @param id     探测值
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function exists(table: any, col: any, id: string): Promise<boolean> {
  const rows = await db.select({ id: col }).from(table).where(eq(col, id)).limit(1);
  return rows.length > 0;
}

const counts: Record<string, number> = {};

async function seedTable(
  name: string,
  table: any,
  idCol: any,
  sampleId: string,
  rows: any[],
): Promise<void> {
  if (await exists(table, idCol, sampleId)) {
    counts[name] = 0;
    console.log(`→ ${name}: already seeded, skipped`);
    return;
  }
  await db.insert(table).values(rows);
  counts[name] = rows.length;
  console.log(`✓ ${name}: inserted ${rows.length} rows`);
}

async function main(): Promise<void> {
  console.log("CodeZone · 开始写入种子数据...\n");

  // 按依赖顺序插入
  await seedTable("users", schema.users, schema.users.id, "u1", users);
  await seedTable("repos", schema.repos, schema.repos.id, "r1", repos);
  await seedTable("labels", schema.labels, schema.labels.id, "l1", labels);
  await seedTable("issues", schema.issues, schema.issues.id, "i1", issues);
  await seedTable("pullRequests", schema.pullRequests, schema.pullRequests.id, "p1", pullRequests);
  await seedTable("commits", schema.commits, schema.commits.id, "c1", commits);
  await seedTable("comments", schema.comments, schema.comments.id, "cm1", comments);
  await seedTable("pipelines", schema.pipelines, schema.pipelines.id, "pl1", pipelines);
  await seedTable("discussions", schema.discussions, schema.discussions.id, "d1", discussions);
  await seedTable("activities", schema.activities, schema.activities.id, "a1", activities);
  await seedTable("fileTrees", schema.fileTrees, schema.fileTrees.repoId, "r1", fileTrees);
  await seedTable("milestones", schema.milestones, schema.milestones.id, "m1", milestones);
  await seedTable("notifications", schema.notifications, schema.notifications.id, "n1", notifications);

  console.log("\n种子完成, 插入数量汇总:");
  for (const [name, count] of Object.entries(counts)) {
    console.log(`  ${name.padEnd(16)} ${count}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ 种子写入失败:", err);
    process.exit(1);
  });
