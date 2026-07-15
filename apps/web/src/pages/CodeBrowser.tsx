import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Save,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FileNode, Repo } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

interface RepoContext {
  repo: Repo;
}

interface BlameLine {
  sha: string;
  author: string;
  date: string;
  line: number;
}

function normalize(p: string): string {
  return p.replace(/^\/+/, "").replace(/\/+$/, "");
}

function findNodeByPath(nodes: FileNode[], target: string): FileNode | null {
  const t = normalize(target);
  if (!t) return null;
  for (const n of nodes) {
    if (normalize(n.path) === t) return n;
    if (n.children) {
      const f = findNodeByPath(n.children, target);
      if (f) return f;
    }
  }
  return null;
}

function findReadme(nodes: FileNode[]): FileNode | null {
  for (const n of nodes) {
    if (n.type === "file" && /^readme(\.md|\.markdown)?$/i.test(n.name)) return n;
    if (n.children) {
      const f = findReadme(n.children);
      if (f) return f;
    }
  }
  return null;
}

function parentDirs(path: string): string[] {
  const segs = normalize(path).split("/").filter(Boolean);
  segs.pop();
  const out: string[] = [];
  let acc = "";
  for (const s of segs) {
    acc = acc ? `${acc}/${s}` : s;
    out.push(acc);
  }
  return out;
}

export default function CodeBrowser() {
  const { repo } = useOutletContext<RepoContext>();
  const params = useParams();
  const navigate = useNavigate();
  const urlPath = params["*"] ?? "";

  const [tree, setTree] = useState<FileNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // 编辑模式
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // 创建文件
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  // 删除文件
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteDeleting, setDeleteDeleting] = useState(false);

  // Git Blame
  const [showBlame, setShowBlame] = useState(false);
  const [blameData, setBlameData] = useState<BlameLine[] | null>(null);
  const [blameLoading, setBlameLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getFileTree(repo.id)
      .then((data: FileNode | FileNode[]) => {
        if (cancelled) return;
        const nodes: FileNode[] = Array.isArray(data)
          ? data
          : data.children ?? [data];
        setTree(nodes);
        const init = new Set<string>();
        // 展开根级目录,呈现初始结构
        nodes
          .filter((n) => n.type === "dir")
          .forEach((n) => init.add(n.path));
        // 展开选中文件(URL 或 README)的所有祖先目录
        const target = urlPath
          ? findNodeByPath(nodes, urlPath)
          : findReadme(nodes);
        if (target) parentDirs(target.path).forEach((p) => init.add(p));
        setExpanded(init);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repo.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = useMemo<FileNode | null>(() => {
    if (!tree) return null;
    if (urlPath) return findNodeByPath(tree, urlPath);
    return findReadme(tree);
  }, [tree, urlPath]);

  // URL 变更时确保父目录已展开
  useEffect(() => {
    if (!selected) return;
    setExpanded((prev) => {
      const parents = parentDirs(selected.path);
      if (parents.every((p) => prev.has(p))) return prev;
      const next = new Set(prev);
      parents.forEach((p) => next.add(p));
      return next;
    });
  }, [selected]);

  // 切换文件时退出编辑模式并重置 blame
  useEffect(() => {
    setIsEditing(false);
    setShowBlame(false);
    setBlameData(null);
  }, [selected?.path]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleSelect = (node: FileNode) => {
    navigate(`/repos/${repo.id}/code/${normalize(node.path)}`);
  };

  // ─── 编辑操作 ───
  const handleStartEdit = () => {
    if (!selected) return;
    setEditContent(selected.content ?? "");
    setIsEditing(true);
    setShowBlame(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    setEditSaving(true);
    try {
      await api.gitCommit(repo.id, `Edit ${selected.path}`, [
        { path: selected.path, content: editContent },
      ]);
      setIsEditing(false);
      // 刷新文件树
      const data = await api.getFileTree(repo.id);
      const nodes: FileNode[] = Array.isArray(data)
        ? data
        : data.children ?? [data];
      setTree(nodes);
    } catch (err: any) {
      alert("保存失败: " + (err.message ?? "未知错误"));
    } finally {
      setEditSaving(false);
    }
  };

  // ─── 创建文件 ───
  const handleCreateFile = async () => {
    if (!newFilePath.trim()) return;
    setCreateSaving(true);
    try {
      await api.gitCommit(repo.id, `Create ${newFilePath.trim()}`, [
        { path: newFilePath.trim(), content: newFileContent },
      ]);
      setShowCreateDialog(false);
      setNewFilePath("");
      setNewFileContent("");
      // 刷新文件树
      const data = await api.getFileTree(repo.id);
      const nodes: FileNode[] = Array.isArray(data)
        ? data
        : data.children ?? [data];
      setTree(nodes);
      // 展开父目录
      const parents = parentDirs(newFilePath.trim());
      if (parents.length > 0) {
        setExpanded((prev) => {
          const next = new Set(prev);
          parents.forEach((p) => next.add(p));
          return next;
        });
      }
    } catch (err: any) {
      alert("创建失败: " + (err.message ?? "未知错误"));
    } finally {
      setCreateSaving(false);
    }
  };

  // ─── 删除文件 ───
  const handleDeleteFile = async () => {
    if (!deleteTarget) return;
    setDeleteDeleting(true);
    try {
      await api.gitDeleteFile(repo.id, deleteTarget);
      setDeleteTarget(null);
      // 刷新文件树
      const data = await api.getFileTree(repo.id);
      const nodes: FileNode[] = Array.isArray(data)
        ? data
        : data.children ?? [data];
      setTree(nodes);
      // 如果删除的是当前选中文件，跳转到 README
      if (selected && normalize(selected.path) === normalize(deleteTarget)) {
        navigate(`/repos/${repo.id}/code`);
      }
    } catch (err: any) {
      alert("删除失败: " + (err.message ?? "未知错误"));
    } finally {
      setDeleteDeleting(false);
    }
  };

  // ─── Git Blame ───
  const handleToggleBlame = async () => {
    if (showBlame) {
      setShowBlame(false);
      setBlameData(null);
      return;
    }
    if (!selected) return;
    setShowBlame(true);
    setBlameLoading(true);
    try {
      const data = await api.gitBlame(repo.id, selected.path);
      setBlameData(data.lines);
    } catch {
      setShowBlame(false);
    } finally {
      setBlameLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="reveal grid lg:grid-cols-[260px_1fr] gap-6">
      {/* 文件树 */}
      <aside className="card p-2 max-h-[75vh] overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
            文件
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="p-0.5 rounded hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors"
            title="新建文件"
          >
            <Plus className="w-3.5 h-3.5 text-neutral-6 dark:text-[var(--neutral-6)]" strokeWidth={1.75} />
          </button>
        </div>
        <div className="space-y-0.5">
          {tree?.map((node) => (
            <TreeRow
              key={node.path}
              node={node}
              depth={0}
              expanded={expanded}
              selectedPath={selected?.path ?? null}
              onToggle={toggle}
              onSelect={handleSelect}
              onDelete={(path) => setDeleteTarget(path)}
            />
          ))}
        </div>
      </aside>

      {/* 代码阅读器 */}
      <section className="min-w-0">
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <FileCode
                className="w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]"
                strokeWidth={1.75}
              />
              <span className="font-mono text-copy-14 text-neutral-8 dark:text-[var(--neutral-8)]">
                {selected.path}
              </span>
              {selected.language && (
                <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] ring-1 ring-border rounded px-1.5 py-0.5">
                  {selected.language}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1">
                {selected.type === "file" && (
                  <>
                    <button
                      onClick={handleToggleBlame}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 text-label-12 rounded transition-colors",
                        showBlame
                          ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                          : "text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)]",
                      )}
                    >
                      Blame
                    </button>
                    {!isEditing ? (
                      <button
                        onClick={handleStartEdit}
                        className="flex items-center gap-1 px-2 py-1 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] rounded transition-colors"
                      >
                        <Pencil className="w-3 h-3" strokeWidth={1.75} />
                        编辑
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          disabled={editSaving}
                          className="flex items-center gap-1 px-2 py-1 text-label-12 text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] rounded transition-colors disabled:opacity-50"
                        >
                          <Save className="w-3 h-3" strokeWidth={1.75} />
                          {editSaving ? "保存中…" : "保存"}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-1 px-2 py-1 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] rounded transition-colors"
                        >
                          <X className="w-3 h-3" strokeWidth={1.75} />
                          取消
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[50vh] font-mono text-copy-13 bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border rounded-md p-4 resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                spellCheck={false}
              />
            ) : (
              <CodeView
                node={selected}
                blameData={showBlame ? blameData : null}
                blameLoading={blameLoading}
              />
            )}
          </div>
        ) : (
          <div className="card flex items-center justify-center h-64 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
            选择左侧文件以查看内容
          </div>
        )}
      </section>

      {/* 创建文件对话框 */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h3 className="text-copy-16 font-semibold text-neutral-9 dark:text-[var(--neutral-9)]">
              新建文件
            </h3>
            <div>
              <label className="block text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] mb-1">
                文件路径
              </label>
              <input
                type="text"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                placeholder="src/index.ts"
                className="w-full font-mono text-copy-13 bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] mb-1">
                内容
              </label>
              <textarea
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                rows={8}
                className="w-full font-mono text-copy-13 bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border rounded px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewFilePath("");
                  setNewFileContent("");
                }}
                className="px-3 py-1.5 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateFile}
                disabled={createSaving || !newFilePath.trim()}
                className="px-3 py-1.5 text-label-12 bg-[var(--color-accent)] text-white rounded transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {createSaving ? "创建中…" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="card w-full max-w-sm p-6 space-y-4">
            <h3 className="text-copy-16 font-semibold text-neutral-9 dark:text-[var(--neutral-9)]">
              确认删除
            </h3>
            <p className="text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)]">
              确定要删除 <code className="font-mono text-copy-13">{deleteTarget}</code> 吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteFile}
                disabled={deleteDeleting}
                className="px-3 py-1.5 text-label-12 bg-red-600 text-white rounded transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleteDeleting ? "删除中…" : "删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TreeRowProps {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (node: FileNode) => void;
  onDelete: (path: string) => void;
}

function TreeRow({
  node,
  depth,
  expanded,
  selectedPath,
  onToggle,
  onSelect,
  onDelete,
}: TreeRowProps) {
  const isDir = node.type === "dir";
  const isOpen = expanded.has(node.path);
  const isSelected = selectedPath === node.path;
  const pad = depth * 14 + 6;
  const base =
    "flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-copy-13 transition-colors duration-300 ease-breathe";

  if (isDir) {
    return (
      <div>
        <button
          onClick={() => onToggle(node.path)}
          className={cn(base, "hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)]")}
          style={{ paddingLeft: pad }}
        >
          {isOpen ? (
            <ChevronDown
              className="w-3 h-3 shrink-0 text-neutral-5 dark:text-[var(--neutral-5)]"
              strokeWidth={1.75}
            />
          ) : (
            <ChevronRight
              className="w-3 h-3 shrink-0 text-neutral-5 dark:text-[var(--neutral-5)]"
              strokeWidth={1.75}
            />
          )}
          {isOpen ? (
            <FolderOpen
              className="w-icon-sm h-icon-sm text-[var(--color-accent)]"
              strokeWidth={1.75}
            />
          ) : (
            <Folder
              className="w-icon-sm h-icon-sm text-neutral-6 dark:text-[var(--neutral-6)]"
              strokeWidth={1.75}
            />
          )}
          <span className="truncate text-neutral-8 dark:text-[var(--neutral-8)]">
            {node.name}
          </span>
        </button>
        {isOpen && node.children && (
          <div>
            {node.children.map((c) => (
              <TreeRow
                key={c.path}
                node={c}
                depth={depth + 1}
                expanded={expanded}
                selectedPath={selectedPath}
                onToggle={onToggle}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isMd = node.language === "markdown" || /\.md$/i.test(node.name);
  const Icon = isMd ? FileText : FileCode;

  return (
    <div className="flex items-center group">
      <button
        onClick={() => onSelect(node)}
        className={cn(
          base,
          "flex-1 min-w-0",
          "hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)]",
          isSelected
            ? "text-[var(--color-accent)] bg-[var(--color-accent-soft)]"
            : "text-neutral-7 dark:text-[var(--neutral-7)]",
        )}
        style={{ paddingLeft: pad + 16 }}
      >
        <Icon className="w-icon-sm h-icon-sm shrink-0" strokeWidth={1.75} />
        <span className="truncate">{node.name}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(node.path);
        }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-all"
        title="删除文件"
      >
        <Trash2 className="w-3 h-3 text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function CodeView({
  node,
  blameData,
  blameLoading,
}: {
  node: FileNode;
  blameData: BlameLine[] | null;
  blameLoading: boolean;
}) {
  const content = node.content ?? "";
  const isMarkdown =
    node.language === "markdown" || /\.md$/i.test(node.name);

  if (isMarkdown) {
    return (
      <div className="prose-yohaku">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  const lines = content.split("\n");

  // 构建 blame lookup：行号 → blame 信息
  const blameMap = useMemo(() => {
    if (!blameData) return new Map<number, BlameLine>();
    const map = new Map<number, BlameLine>();
    for (const b of blameData) {
      map.set(b.line, b);
    }
    return map;
  }, [blameData]);

  const blameWidth = blameData ? "240px" : "0px";

  return (
    <div className="font-mono text-copy-13 bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border rounded-md overflow-x-auto">
      {blameLoading && (
        <div className="px-4 py-2 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
          加载 blame 信息…
        </div>
      )}
      <pre className="p-4">
        <code>
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const blame = blameMap.get(lineNum);
            return (
              <div key={i} className="flex">
                {blameData && (
                  <span
                    className="select-none text-neutral-5 dark:text-[var(--neutral-5)] text-copy-11 whitespace-nowrap overflow-hidden"
                    style={{ width: blameWidth, minWidth: blameWidth }}
                  >
                    {blame ? (
                      <span className="flex gap-1">
                        <span className="text-[var(--color-accent)] font-medium">
                          {blame.sha.slice(0, 7)}
                        </span>
                        <span>{blame.author}</span>
                        <span className="text-neutral-4 dark:text-[var(--neutral-4)]">
                          {blame.date.slice(0, 10)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-neutral-4 dark:text-[var(--neutral-4)]">
                        -
                      </span>
                    )}
                  </span>
                )}
                <span
                  className="select-none text-neutral-5 dark:text-[var(--neutral-5)] pr-4 text-right tabular-nums"
                  style={{ minWidth: "2.5em" }}
                >
                  {lineNum}
                </span>
                <span className="flex-1 whitespace-pre">{line || " "}</span>
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
