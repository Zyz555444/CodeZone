import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, FileCode, FileText, GitBranch,
  Radio, Zap, Shield, Layers, MessageSquare,
  Plus, Trash2, History, Clock, CheckCircle2, Circle,
  Send, Users, Wifi, Loader, X, Check,
} from "lucide-react";
import CollaborativeEditor from "@/components/CollaborativeEditor";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { relativeTime, formatDate, avatarInitial, avatarColor } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type {
  Document, DocumentVersion, DocumentComment, User,
} from "@/lib/types";

type Mode = "demo" | "live";
type SidebarTab = "comments" | "versions" | "info";

const DEMO_FILE_NAME = "TodoList.tsx";

export default function CollaboratePage() {
  const { currentUser, team } = useAppStore();
  const [mode, setMode] = useState<Mode>("demo");
  const [docs, setDocs] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("comments");
  const [comments, setComments] = useState<(DocumentComment & { author?: User })[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [presence, setPresence] = useState<number>(0);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentLine, setCommentLine] = useState<number | null>(null);
  const [versionMessage, setVersionMessage] = useState("");
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [versionSuccess, setVersionSuccess] = useState<string>("");
  const latestContentRef = useRef<string>("");
  // 请求序列号:防止快速切换文档时旧请求覆盖新数据
  const loadSeqRef = useRef(0);
  // 最新内容同步:由编辑器通过 onContentChange 实时更新,版本快照读取最新值
  const editorContentRef = useRef<string>("");

  const hasTeam = !!team;
  const canEditLive = hasTeam && !!currentUser;

  // live 模式下加载文档列表
  const refreshDocs = async () => {
    if (!hasTeam) return;
    setDocsLoading(true);
    try {
      const list = await api.getDocs();
      setDocs(list);
    } catch (e) {
      setActiveError(e instanceof Error ? e.message : "加载文档列表失败");
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "live" && hasTeam) refreshDocs();
  }, [mode, hasTeam]);

  // activeDocId 变化时加载文档详情 + 评论 + 版本 + 在线人数
  // 使用序列号防止快速切换文档时旧请求覆盖新数据 (race condition)
  useEffect(() => {
    if (!activeDocId) {
      setActiveDoc(null);
      setComments([]);
      setVersions([]);
      setPresence(0);
      editorContentRef.current = "";
      return;
    }
    // 自增序列号,本次请求的"令牌"
    const seq = ++loadSeqRef.current;
    setDocLoading(true);
    setActiveError(null);
    Promise.all([
      api.getDoc(activeDocId),
      api.getDocComments(activeDocId).catch(() => []),
      api.getDocVersions(activeDocId).catch(() => []),
      api.getDocPresence(activeDocId).catch(() => ({ onlineCount: 0 })),
    ])
      .then(([doc, cmts, vers, pres]) => {
        // 若期间已切换到其他文档,丢弃本次结果
        if (seq !== loadSeqRef.current) return;
        setActiveDoc(doc);
        setComments(cmts);
        setVersions(vers);
        setPresence(pres.onlineCount ?? 0);
        latestContentRef.current = doc.content;
        editorContentRef.current = doc.content;
      })
      .catch((e) => {
        if (seq !== loadSeqRef.current) return;
        setActiveError(e instanceof Error ? e.message : "加载文档失败");
      })
      .finally(() => {
        if (seq === loadSeqRef.current) setDocLoading(false);
      });

    // 定时刷新在线人数（4s）,捕获当前 activeDocId 与 seq
    const timer = setInterval(async () => {
      // 切换文档后停止旧轮询
      if (seq !== loadSeqRef.current) return;
      try {
        const p = await api.getDocPresence(activeDocId);
        if (seq !== loadSeqRef.current) return;
        setPresence(p.onlineCount ?? 0);
      } catch {
        /* 忽略轮询失败 */
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [activeDocId]);

  // 切换 live 模式时，默认选中第一个文档（如有）
  useEffect(() => {
    if (mode === "live" && docs.length > 0 && !activeDocId) {
      setActiveDocId(docs[0].id);
    }
    if (mode === "demo") {
      setActiveDocId(null);
      setActiveDoc(null);
    }
  }, [mode, docs, activeDocId]);

  // 创建文档
  async function handleCreateDoc(e: FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || !currentUser || !hasTeam) return;
    setCreating(true);
    try {
      const doc = await api.createDoc({ title, content: "", language: "typescript" });
      setDocs((prev) => [doc, ...prev]);
      setActiveDocId(doc.id);
      setNewTitle("");
    } catch (err) {
      setActiveError(err instanceof Error ? err.message : "创建文档失败");
    } finally {
      setCreating(false);
    }
  }

  // 删除文档
  async function handleDeleteDoc(doc: Document) {
    const ok = window.confirm(`确定删除文档「${doc.title}」吗?该操作不可撤销。`);
    if (!ok) return;
    try {
      await api.deleteDoc(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      if (activeDocId === doc.id) {
        setActiveDocId(null);
      }
    } catch (e) {
      setActiveError(e instanceof Error ? e.message : "删除文档失败");
    }
  }

  // 自动保存回调（传给编辑器）
  async function handleSave(content: string) {
    if (!activeDocId) return;
    try {
      await api.saveDoc(activeDocId, content);
      latestContentRef.current = content;
      setActiveDoc((prev) =>
        prev ? { ...prev, content, updatedAt: Date.now() } : prev,
      );
      setDocs((prev) =>
        prev.map((d) => (d.id === activeDocId ? { ...d, updatedAt: Date.now() } : d)),
      );
    } catch (e) {
      setActiveError(e instanceof Error ? e.message : "保存失败,请检查网络后重试");
    }
  }

  // 创建评论
  async function handleCreateComment(e: FormEvent) {
    e.preventDefault();
    const body = commentDraft.trim();
    if (!body || !activeDocId || !currentUser) return;
    const draft: DocumentComment & { author?: User } = {
      id: `local-${Date.now()}`,
      docId: activeDocId,
      authorId: currentUser.id,
      body,
      lineNumber: commentLine,
      resolved: false,
      createdAt: Date.now(),
      author: currentUser,
    };
    setComments((prev) => [...prev, draft]);
    setCommentDraft("");
    setCommentLine(null);
    try {
      const created = await api.createDocComment(activeDocId, body, commentLine ?? undefined);
      setComments((prev) => prev.map((c) => (c.id === draft.id ? { ...created, author: currentUser } : c)));
    } catch (err) {
      setComments((prev) => prev.filter((c) => c.id !== draft.id));
      setActiveError(err instanceof Error ? err.message : "评论发布失败");
    }
  }

  // 解决/恢复评论
  async function handleToggleResolve(c: DocumentComment) {
    setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, resolved: !x.resolved } : x)));
    try {
      await api.resolveDocComment(c.docId, c.id, !c.resolved);
    } catch {
      setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, resolved: c.resolved } : x)));
    }
  }

  // 删除评论
  async function handleDeleteComment(c: DocumentComment) {
    setComments((prev) => prev.filter((x) => x.id !== c.id));
    try {
      await api.deleteDocComment(c.docId, c.id);
    } catch {
      setComments((prev) => [...prev, c]);
    }
  }

  // 创建版本快照
  async function handleCreateVersion(e: FormEvent) {
    e.preventDefault();
    if (!activeDocId || !currentUser) return;
    setCreatingVersion(true);
    try {
      const content = editorContentRef.current || latestContentRef.current || activeDoc?.content || "";
      const v = await api.createDocVersion(activeDocId, content, versionMessage.trim() || undefined);
      setVersions((prev) => [v, ...prev]);
      setVersionMessage("");
    } catch (err) {
      setActiveError(err instanceof Error ? err.message : "版本创建失败");
    } finally {
      setCreatingVersion(false);
    }
  }

  // 查看版本（恢复到该版本）
  async function handleViewVersion(v: DocumentVersion) {
    if (!activeDoc || !activeDocId) return;
    const ok = window.confirm(`将当前文档恢复到版本「${v.message || "无标题"}」(创建于 ${formatDate(v.createdAt)})?`);
    if (!ok) return;
    try {
      await api.saveDoc(activeDocId, v.content);
      setActiveDoc((prev) => (prev ? { ...prev, content: v.content, updatedAt: Date.now() } : prev));
      latestContentRef.current = v.content;
      // 显示成功提示,保留编辑器状态,不强制刷新页面
      setVersionSuccess(`已恢复到版本「${v.message || "无标题"}」`);
      setTimeout(() => setVersionSuccess(""), 3000);
    } catch (e) {
      setActiveError(e instanceof Error ? e.message : "恢复版本失败");
    }
  }

  const sortedDocs = useMemo(() => [...docs].sort((a, b) => b.updatedAt - a.updatedAt), [docs]);
  const unresolvedCount = comments.filter((c) => !c.resolved).length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* 页面头部 */}
      <div className="px-6 py-3.5 border-b border-border bg-paper">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/repos"
              className="grid place-items-center w-8 h-8 rounded-md text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] transition-colors duration-300 ease-breathe"
            >
              <ArrowLeft className="w-icon-md h-icon-md" strokeWidth={1.75} />
            </Link>
            <div>
              <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-0.5">
                实时协作
              </p>
              <h1 className="font-serif text-title-24 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
                协作编辑器
              </h1>
            </div>
          </div>

          {/* 模式切换 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md bg-neutral-2 dark:bg-[var(--neutral-2)] p-0.5">
              <button
                onClick={() => setMode("demo")}
                className={cn(
                  "px-3 py-1.5 text-label-12 font-medium rounded-[5px] transition-all duration-300 ease-breathe",
                  mode === "demo"
                    ? "bg-paper text-neutral-9 dark:text-[var(--neutral-9)] shadow-sm"
                    : "text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-8 dark:hover:text-[var(--neutral-8)]",
                )}
              >
                <Zap className="inline w-3 h-3 mr-1.5 -translate-y-px" strokeWidth={1.75} />
                演示模式
              </button>
              <button
                onClick={() => setMode("live")}
                disabled={!hasTeam}
                title={!hasTeam ? "请先加入或创建团队" : "实时多人协作"}
                className={cn(
                  "px-3 py-1.5 text-label-12 font-medium rounded-[5px] transition-all duration-300 ease-breathe disabled:opacity-40 disabled:pointer-events-none",
                  mode === "live"
                    ? "bg-paper text-neutral-9 dark:text-[var(--neutral-9)] shadow-sm"
                    : "text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-8 dark:hover:text-[var(--neutral-8)]",
                )}
              >
                <Radio className="inline w-3 h-3 mr-1.5 -translate-y-px" strokeWidth={1.75} />
                实时模式
              </button>
            </div>
            {mode === "live" && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-2 dark:bg-[var(--neutral-2)] text-neutral-6 dark:text-[var(--neutral-6)] text-label-12">
                <GitBranch className="w-3 h-3" /> {team?.name ?? "—"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 错误提示条 */}
      {activeError && (
        <div className="px-4 py-2 bg-error/10 text-error text-label-12 flex items-center justify-between">
          <span>{activeError}</span>
          <button onClick={() => setActiveError(null)} className="text-error/70 hover:text-error">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 成功提示条 (例如恢复版本) */}
      {versionSuccess && (
        <div className="px-4 py-2 bg-success/10 text-success text-label-12 flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          <span>{versionSuccess}</span>
        </div>
      )}

      {/* 主体 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧:文档列表 (live 模式) */}
        {mode === "live" && (
          <aside className="hidden md:flex flex-col w-60 border-r border-border bg-neutral-1 dark:bg-[var(--neutral-1)]">
            <div className="p-3 border-b border-border">
              <form onSubmit={handleCreateDoc} className="flex gap-1.5">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="新文档标题…"
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md bg-paper text-label-12 text-neutral-9 dark:text-[var(--neutral-9)] placeholder:text-neutral-4 dark:placeholder:text-[var(--neutral-4)] ring-1 ring-border focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none transition-shadow"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newTitle.trim() || creating}
                  aria-label="创建文档"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto">
              {docsLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : sortedDocs.length === 0 ? (
                <div className="p-4 text-center">
                  <FileText className="w-6 h-6 mx-auto mb-2 text-neutral-4 dark:text-[var(--neutral-4)]" strokeWidth={1.5} />
                  <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                    {hasTeam ? "还没有文档,创建第一个吧" : "需先加入团队"}
                  </p>
                </div>
              ) : (
                <ul className="p-2 space-y-1">
                  {sortedDocs.map((d) => {
                    const isActive = d.id === activeDocId;
                    return (
                      <li key={d.id}>
                        <button
                          onClick={() => setActiveDocId(d.id)}
                          className={cn(
                            "w-full text-left px-2.5 py-2 rounded-md group transition-all duration-200 ease-breathe",
                            isActive
                              ? "bg-paper ring-1 ring-border shadow-sm"
                              : "hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)]",
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <FileCode
                              className={cn(
                                "w-3.5 h-3.5 mt-0.5 shrink-0",
                                isActive
                                  ? "text-[var(--color-accent)]"
                                  : "text-neutral-4 dark:text-[var(--neutral-4)]",
                              )}
                              strokeWidth={1.75}
                            />
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-label-12 font-medium truncate",
                                  isActive
                                    ? "text-neutral-9 dark:text-[var(--neutral-9)]"
                                    : "text-neutral-7 dark:text-[var(--neutral-7)]",
                                )}
                              >
                                {d.title}
                              </p>
                              <p className="text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)] mt-0.5">
                                {relativeTime(d.updatedAt)} · {d.language}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDoc(d);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-neutral-4 dark:text-[var(--neutral-4)] hover:text-error transition-all"
                              aria-label="删除文档"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        )}

        {/* 编辑器区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 文件标签条 (live 模式:显示当前文档) */}
          {mode === "live" && (
            <div className="flex items-center bg-neutral-1 dark:bg-[var(--neutral-1)] border-b border-border">
              <div className="flex items-center gap-1.5 px-4 py-2 text-label-12 border-r border-border bg-paper">
                <FileCode className="w-3.5 h-3.5 text-[var(--color-accent)]" strokeWidth={1.75} />
                <span className="font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                  {activeDoc ? activeDoc.title : docLoading ? "加载中…" : "未选择"}
                </span>
              </div>
              <div className="flex-1" />
              <span className="px-4 text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)] font-mono">
                UTF-8 · LF · {activeDoc?.language ?? "—"}
              </span>
            </div>
          )}

          {/* 协作编辑器 / 占位 */}
          <div className="flex-1 min-h-0 bg-paper">
            {mode === "demo" ? (
              <CollaborativeEditor
                mode="demo"
                docId={null}
                fileName={DEMO_FILE_NAME}
                language="typescript"
              />
            ) : !hasTeam ? (
              <EmptyState
                icon={<Users className="w-8 h-8" strokeWidth={1.5} />}
                title="需要先加入团队"
                desc="实时协作模式基于团队隔离文档与房间。请先创建或加入一个团队。"
                action={
                  <Link to="/team">
                    <Button variant="primary" size="md">前往团队</Button>
                  </Link>
                }
              />
            ) : !activeDocId || !activeDoc ? (
              <EmptyState
                icon={<FileText className="w-8 h-8" strokeWidth={1.5} />}
                title={docLoading ? "加载中…" : "选择或创建文档"}
                desc="从左侧文档列表选择一个文档开始协作,或在左上角输入标题创建新文档。"
              />
            ) : (
              <CollaborativeEditor
                key={activeDoc.id}
                mode="live"
                docId={activeDoc.id}
                fileName={activeDoc.title}
                language={activeDoc.language}
                initialContent={activeDoc.content}
                onSave={canEditLive ? handleSave : undefined}
                onContentChange={(c) => { editorContentRef.current = c; }}
              />
            )}
          </div>
        </div>

        {/* 右侧信息栏 */}
        <aside className="hidden lg:flex flex-col w-72 border-l border-border bg-paper overflow-y-auto">
          {mode === "live" ? (
            <>
              {/* 标签切换 */}
              <div className="flex items-center border-b border-border bg-neutral-1 dark:bg-[var(--neutral-1)]">
                {([
                  { id: "comments" as const, label: "评论", icon: MessageSquare, badge: unresolvedCount },
                  { id: "versions" as const, label: "版本", icon: History, badge: versions.length },
                  { id: "info" as const, label: "信息", icon: Radio, badge: undefined as number | undefined },
                ]).map((t) => {
                  const Icon = t.icon;
                  const active = sidebarTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSidebarTab(t.id)}
                      disabled={!activeDocId}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-label-12 font-medium border-b-2 transition-all duration-300 ease-breathe disabled:opacity-40 disabled:pointer-events-none",
                        active
                          ? "border-b-[var(--color-accent)] text-neutral-9 dark:text-[var(--neutral-9)]"
                          : "border-transparent text-neutral-5 dark:text-[var(--neutral-5)] hover:text-neutral-7 dark:hover:text-[var(--neutral-7)]",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                      {t.label}
                      {t.badge !== undefined && t.badge > 0 && (
                        <span className="ml-0.5 px-1.5 py-px rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] text-caption-10 font-mono">
                          {t.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {!activeDocId ? (
                  <div className="text-center py-10 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                    请先选择一个文档
                  </div>
                ) : sidebarTab === "comments" ? (
                  <CommentsPanel
                    comments={comments}
                    currentUserId={currentUser?.id}
                    draft={commentDraft}
                    setDraft={setCommentDraft}
                    line={commentLine}
                    setLine={setCommentLine}
                    onSubmit={handleCreateComment}
                    onToggleResolve={handleToggleResolve}
                    onDelete={handleDeleteComment}
                  />
                ) : sidebarTab === "versions" ? (
                  <VersionsPanel
                    versions={versions}
                    message={versionMessage}
                    setMessage={setVersionMessage}
                    onCreate={handleCreateVersion}
                    onView={handleViewVersion}
                    creating={creatingVersion}
                  />
                ) : (
                  <InfoPanel
                    doc={activeDoc}
                    presence={presence}
                    docLoading={docLoading}
                  />
                )}
              </div>
            </>
          ) : (
            <DemoSidebar />
          )}
        </aside>
      </div>
    </div>
  );
}

// ───────────────────────────── 评论面板 ─────────────────────────────
interface CommentsPanelProps {
  comments: (DocumentComment & { author?: User })[];
  currentUserId?: string;
  draft: string;
  setDraft: (s: string) => void;
  line: number | null;
  setLine: (n: number | null) => void;
  onSubmit: (e: FormEvent) => void;
  onToggleResolve: (c: DocumentComment) => void;
  onDelete: (c: DocumentComment) => void;
}

function CommentsPanel({
  comments, currentUserId, draft, setDraft, line, setLine, onSubmit, onToggleResolve, onDelete,
}: CommentsPanelProps) {
  if (comments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <MessageSquare className="w-6 h-6 mx-auto mb-2 text-neutral-4 dark:text-[var(--neutral-4)]" strokeWidth={1.5} />
          <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
            暂无评论,在下方发表第一条
          </p>
        </div>
        <CommentForm
          draft={draft}
          setDraft={setDraft}
          line={line}
          setLine={setLine}
          onSubmit={onSubmit}
        />
      </div>
    );
  }

  const sorted = [...comments].sort((a, b) => {
    // 未解决在前,按行号排序
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    const la = a.lineNumber ?? 0;
    const lb = b.lineNumber ?? 0;
    if (la !== lb) return la - lb;
    return a.createdAt - b.createdAt;
  });

  return (
    <div className="space-y-3">
      {sorted.map((c) => {
        const isMine = c.authorId === currentUserId;
        const name = c.author?.name ?? "已注销";
        return (
          <div
            key={c.id}
            className={cn(
              "card p-3 transition-opacity duration-300",
              c.resolved && "opacity-60",
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="grid place-items-center w-5 h-5 rounded-full text-white text-caption-10 font-medium"
                style={{ backgroundColor: avatarColor(name) }}
              >
                {avatarInitial(name)}
              </span>
              <span className="text-label-12 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">{name}</span>
              {c.lineNumber !== null && (
                <span className="px-1.5 py-0.5 rounded bg-neutral-2 dark:bg-[var(--neutral-2)] text-caption-10 text-neutral-6 dark:text-[var(--neutral-6)] font-mono">
                  L{c.lineNumber}
                </span>
              )}
              <span className="ml-auto text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)]">
                {relativeTime(c.createdAt)}
              </span>
            </div>
            <p className="text-copy-13 text-neutral-7 dark:text-[var(--neutral-7)] leading-relaxed whitespace-pre-wrap break-words">
              {c.body}
            </p>
            <div className="flex items-center gap-1 mt-2 -ml-1">
              <button
                onClick={() => onToggleResolve(c)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)] hover:text-success hover:bg-success/10 transition-colors"
              >
                {c.resolved ? (
                  <><Circle className="w-3 h-3" /> 重新打开</>
                ) : (
                  <><CheckCircle2 className="w-3 h-3" /> 解决</>
                )}
              </button>
              {isMine && (
                <button
                  onClick={() => onDelete(c)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)] hover:text-error hover:bg-error/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> 删除
                </button>
              )}
            </div>
          </div>
        );
      })}
      <CommentForm
        draft={draft}
        setDraft={setDraft}
        line={line}
        setLine={setLine}
        onSubmit={onSubmit}
      />
    </div>
  );
}

interface CommentFormProps {
  draft: string;
  setDraft: (s: string) => void;
  line: number | null;
  setLine: (n: number | null) => void;
  onSubmit: (e: FormEvent) => void;
}

function CommentForm({ draft, setDraft, line, setLine, onSubmit }: CommentFormProps) {
  return (
    <form onSubmit={onSubmit} className="card p-3 space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <span className="text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
          行号 (可选)
        </span>
        <input
          type="number"
          min={1}
          value={line ?? ""}
          onChange={(e) => setLine(e.target.value ? Number(e.target.value) : null)}
          placeholder="—"
          className="w-16 px-2 py-0.5 rounded bg-neutral-1 dark:bg-[var(--neutral-1)] text-label-12 text-neutral-8 dark:text-[var(--neutral-8)] ring-1 ring-border focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none transition-shadow"
        />
        {line !== null && (
          <button
            type="button"
            onClick={() => setLine(null)}
            className="text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)] hover:text-error"
          >
            清除
          </button>
        )}
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="对这段代码有什么想法?"
        rows={3}
        className="w-full px-2.5 py-2 rounded-md bg-neutral-1 dark:bg-[var(--neutral-1)] text-copy-13 text-neutral-9 dark:text-[var(--neutral-9)] placeholder:text-neutral-4 dark:placeholder:text-[var(--neutral-4)] ring-1 ring-border focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none transition-shadow resize-none"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!draft.trim()}
        >
          <Send className="w-3 h-3" />
          发表
        </Button>
      </div>
    </form>
  );
}

// ───────────────────────────── 版本面板 ─────────────────────────────
interface VersionsPanelProps {
  versions: DocumentVersion[];
  message: string;
  setMessage: (s: string) => void;
  onCreate: (e: FormEvent) => void;
  onView: (v: DocumentVersion) => void;
  creating: boolean;
}

function VersionsPanel({
  versions, message, setMessage, onCreate, onView, creating,
}: VersionsPanelProps) {
  return (
    <div className="space-y-3">
      <form onSubmit={onCreate} className="card p-3 space-y-2">
        <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)]">
          创建版本快照
        </p>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="版本说明(如:重构 debounce 泛型)"
          className="w-full px-2.5 py-1.5 rounded-md bg-neutral-1 dark:bg-[var(--neutral-1)] text-label-12 text-neutral-9 dark:text-[var(--neutral-9)] placeholder:text-neutral-4 dark:placeholder:text-[var(--neutral-4)] ring-1 ring-border focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none transition-shadow"
        />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" size="sm" disabled={creating}>
            {creating ? <Loader className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
            创建快照
          </Button>
        </div>
      </form>

      {versions.length === 0 ? (
        <div className="text-center py-8">
          <History className="w-6 h-6 mx-auto mb-2 text-neutral-4 dark:text-[var(--neutral-4)]" strokeWidth={1.5} />
          <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
            暂无版本快照
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {versions.map((v, i) => (
            <li key={v.id} className="card p-3">
              <div className="flex items-start gap-2.5">
                <span className="grid place-items-center w-6 h-6 rounded-md bg-[var(--color-accent-soft)] text-[var(--color-accent)] shrink-0 mt-0.5">
                  <GitBranch className="w-3 h-3" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-label-12 font-medium text-neutral-9 dark:text-[var(--neutral-9)] truncate">
                    {v.message || `版本 ${versions.length - i}`}
                  </p>
                  <p className="text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)] mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDate(v.createdAt)} · {relativeTime(v.createdAt)}
                  </p>
                  <p className="text-caption-10 text-neutral-4 dark:text-[var(--neutral-4)] mt-0.5 font-mono">
                    {(v.content.length / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => onView(v)}
                className="mt-2 w-full px-2.5 py-1 rounded-md bg-neutral-1 dark:bg-[var(--neutral-1)] text-caption-10 text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] transition-colors"
              >
                恢复到此版本
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────────── 信息面板 ─────────────────────────────
function InfoPanel({
  doc, presence, docLoading,
}: {
  doc: Document | null;
  presence: number;
  docLoading: boolean;
}) {
  if (docLoading || !doc) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <section>
        <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-3">
          会话信息
        </p>
        <div className="space-y-2.5 text-label-12">
          <div className="flex justify-between">
            <span className="text-neutral-5 dark:text-[var(--neutral-5)]">房间 ID</span>
            <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)] truncate max-w-[160px]">
              {doc.id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-5 dark:text-[var(--neutral-5)]">在线人数</span>
            <span className="flex items-center gap-1 text-success font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-breathe" />
              {presence}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-5 dark:text-[var(--neutral-5)]">协议</span>
            <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)]">CRDT + Awareness</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-5 dark:text-[var(--neutral-5)]">语言</span>
            <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)]">{doc.language}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-5 dark:text-[var(--neutral-5)]">创建时间</span>
            <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)]">{formatDate(doc.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-5 dark:text-[var(--neutral-5)]">最后更新</span>
            <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)]">{relativeTime(doc.updatedAt)}</span>
          </div>
        </div>
      </section>

      <section>
        <p className="text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-3">
          引擎特性
        </p>
        <div className="space-y-3">
          {[
            { icon: Layers, title: "CRDT 文本合并", desc: "并发编辑无冲突自动收敛" },
            { icon: Radio, title: "Awareness 感知", desc: "光标、选区、在线状态秒级同步" },
            { icon: Wifi, title: "心跳保活", desc: "30s ping/pong + 超时清理" },
            { icon: Shield, title: "团队隔离", desc: "房间按文档维度隔离" },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex gap-2.5">
                <span className="grid place-items-center w-7 h-7 rounded-md bg-[var(--color-accent-soft)] text-[var(--color-accent)] shrink-0">
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-copy-13 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">{f.title}</p>
                  <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ───────────────────────────── 演示模式侧栏 ─────────────────────────────
function DemoSidebar() {
  return (
    <div className="p-5 space-y-6">
      <section className="reveal reveal-1">
        <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-3">
          协作引擎
        </p>
        <div className="space-y-3">
          {[
            { icon: Layers, title: "CRDT 文本合并", desc: "并发编辑无冲突自动收敛,每字符携带逻辑时钟" },
            { icon: Radio, title: "Awareness 感知", desc: "实时光标、选区、在线状态秒级同步" },
            { icon: Zap, title: "亚秒级延迟", desc: "操作增量传输,本地即时应用" },
            { icon: Shield, title: "Tombstone 保留", desc: "删除标记不丢失历史,支持撤销协作" },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex gap-3">
                <span className="grid place-items-center w-7 h-7 rounded-md bg-[var(--color-accent-soft)] text-[var(--color-accent)] shrink-0">
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-copy-13 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">{f.title}</p>
                  <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="reveal reveal-2">
        <p className="text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-3">
          如何体验
        </p>
        <div className="card p-4 space-y-2.5 text-label-12 text-neutral-7 dark:text-[var(--neutral-7)] leading-relaxed">
          <p className="flex gap-2">
            <span className="text-[var(--color-accent)] font-mono shrink-0">01</span>
            点击右上 <span className="font-medium text-neutral-9 dark:text-[var(--neutral-9)]">启动协作</span> 按钮
          </p>
          <p className="flex gap-2">
            <span className="text-[var(--color-accent)] font-mono shrink-0">02</span>
            虚拟协作者开始编辑,你会看到彩色光标实时移动
          </p>
          <p className="flex gap-2">
            <span className="text-[var(--color-accent)] font-mono shrink-0">03</span>
            你可同时输入,CRDT 自动合并并发修改
          </p>
          <p className="flex gap-2">
            <span className="text-[var(--color-accent)] font-mono shrink-0">04</span>
            点击协作者头像进入 <span className="font-medium text-neutral-9 dark:text-[var(--neutral-9)]">跟随模式</span>
          </p>
          <p className="flex gap-2 pt-1 border-t border-border mt-2">
            <span className="text-[var(--color-accent)] font-mono shrink-0">05</span>
            切换到 <span className="font-medium text-neutral-9 dark:text-[var(--neutral-9)]">实时模式</span> 体验真实多人协作
          </p>
        </div>
      </section>

      <section className="reveal reveal-3">
        <p className="text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)] mb-3">
          会话信息
        </p>
        <div className="space-y-2 text-label-12">
          <div className="flex justify-between">
            <span className="text-neutral-5 dark:text-[var(--neutral-5)]">房间 ID</span>
            <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)]">cz-demo-local</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-5 dark:text-[var(--neutral-5)]">协议</span>
            <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)]">CRDT + Awareness</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-5 dark:text-[var(--neutral-5)]">协作者</span>
            <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)]">3 虚拟 + 你</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-5 dark:text-[var(--neutral-5)]">最大协作者</span>
            <span className="font-mono text-neutral-8 dark:text-[var(--neutral-8)]">12</span>
          </div>
        </div>
      </section>
    </div>
  );
}

// ───────────────────────────── 空状态 ─────────────────────────────
function EmptyState({
  icon, title, desc, action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center h-full">
      <div className="text-center max-w-sm px-6">
        <div className="grid place-items-center w-16 h-16 rounded-2xl bg-neutral-2 dark:bg-[var(--neutral-2)] text-neutral-5 dark:text-[var(--neutral-5)] mx-auto mb-4">
          {icon}
        </div>
        <h3 className="font-serif text-title-20 font-medium text-neutral-9 dark:text-[var(--neutral-9)] mb-1.5">
          {title}
        </h3>
        <p className="text-copy-13 text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed mb-4">
          {desc}
        </p>
        {action}
      </div>
    </div>
  );
}
