import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
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
        <p className="px-2 py-1.5 text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
          文件
        </p>
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
            </div>
            <CodeView node={selected} />
          </div>
        ) : (
          <div className="card flex items-center justify-center h-64 text-copy-14 text-neutral-5 dark:text-[var(--neutral-5)]">
            选择左侧文件以查看内容
          </div>
        )}
      </section>
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
}

function TreeRow({
  node,
  depth,
  expanded,
  selectedPath,
  onToggle,
  onSelect,
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
    <button
      onClick={() => onSelect(node)}
      className={cn(
        base,
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
  );
}

function CodeView({ node }: { node: FileNode }) {
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

  return (
    <pre className="font-mono text-copy-13 bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border rounded-md p-4 overflow-x-auto">
      <code>
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span
              className="select-none text-neutral-5 dark:text-[var(--neutral-5)] pr-4 text-right tabular-nums"
              style={{ minWidth: "2.5em" }}
            >
              {i + 1}
            </span>
            <span className="flex-1 whitespace-pre">{line || " "}</span>
          </div>
        ))}
      </code>
    </pre>
  );
}
