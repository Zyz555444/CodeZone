'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Folder, FolderOpen, File, FileCode, FileText, FileJson, ChevronRight, Loader2, Plus, RefreshCw, Search, X } from 'lucide-react';
import { apiUrl } from '@/lib/env';
import { authFetch } from '@/lib/utils';

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: string;
  children?: FileNode[];
}

export type { FileNode };

interface FileTreeProps {
  projectId: string;
  onFileSelect: (file: FileNode) => void;
  activeFilePath?: string;
  onCreateFile?: () => void;
  refreshKey?: number;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  ts: <FileCode className="h-3.5 w-3.5 text-info" />,
  tsx: <FileCode className="h-3.5 w-3.5 text-info" />,
  js: <FileCode className="h-3.5 w-3.5 text-warning" />,
  jsx: <FileCode className="h-3.5 w-3.5 text-info" />,
  json: <FileJson className="h-3.5 w-3.5 text-warning" />,
  md: <FileText className="h-3.5 w-3.5 text-neutral-6" />,
  css: <FileText className="h-3.5 w-3.5 text-info" />,
  scss: <FileText className="h-3.5 w-3.5 text-accent" />,
  html: <FileCode className="h-3.5 w-3.5 text-warning" />,
  prisma: <FileCode className="h-3.5 w-3.5 text-accent" />,
};

function getFileIcon(name: string): React.ReactNode {
  const ext = name.split('.').pop() || '';
  return FILE_ICONS[ext] || <File className="h-3.5 w-3.5 text-neutral-6" />;
}

function getLanguageFromFilename(name: string): string {
  const ext = name.split('.').pop() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', css: 'css', scss: 'scss', html: 'html', md: 'markdown',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    sql: 'sql', yaml: 'yaml', yml: 'yaml', xml: 'xml', prisma: 'prisma',
    sh: 'shell', bash: 'shell', docker: 'dockerfile',
  };
  return langMap[ext] || 'text';
}

function FileTreeItem({
  node,
  depth,
  activeFilePath,
  onSelect,
  filter,
}: {
  node: FileNode;
  depth: number;
  activeFilePath?: string;
  onSelect: (file: FileNode) => void;
  filter: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isExpanded = filter ? true : expanded;

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-left text-copy-13 text-neutral-7 hover:bg-neutral-2 rounded transition-colors"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          {isExpanded ? <FolderOpen className="h-3.5 w-3.5 text-accent/70" /> : <Folder className="h-3.5 w-3.5 text-accent/50" />}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && node.children?.map((child, _i) => (
          <FileTreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            activeFilePath={activeFilePath}
            onSelect={onSelect}
            filter={filter}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node)}
      className={`flex items-center gap-1.5 w-full px-2 py-1 text-left text-copy-13 rounded transition-colors ${
        activeFilePath === node.path
          ? 'bg-accent/10 text-accent font-medium'
          : 'text-neutral-8 hover:bg-neutral-2'
      }`}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
    >
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

function filterNodes(nodes: FileNode[], query: string): FileNode[] {
  if (!query.trim()) return nodes;
  const lower = query.toLowerCase();
  return nodes
    .map((node) => {
      if (node.type === 'directory' && node.children) {
        const filteredChildren = filterNodes(node.children, query);
        if (filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
      }
      if (node.name.toLowerCase().includes(lower) || node.path.toLowerCase().includes(lower)) {
        return node;
      }
      return null;
    })
    .filter((n): n is FileNode => n !== null);
}

export function FileTree({ projectId, onFileSelect, activeFilePath, onCreateFile, refreshKey }: FileTreeProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(apiUrl(`/api/code/files?projectId=${encodeURIComponent(projectId)}`));
      if (!res.ok) throw new Error('加载文件树失败');
      const data = await res.json();
      setFiles(data.files || []);
    } catch (e: any) {
      setError(e.message);
      setFiles(getDefaultFiles());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchFiles();
  }, [projectId, fetchFiles]);

  useEffect(() => {
    if (refreshKey) fetchFiles();
  }, [refreshKey, fetchFiles]);

  const filteredFiles = useMemo(() => filterNodes(files, filter), [files, filter]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-3">
        <span className="text-label-12 font-medium text-neutral-7 uppercase tracking-wider">文件</span>
        <div className="flex items-center gap-1">
          <button onClick={fetchFiles} className="p-1 rounded hover:bg-neutral-2 text-neutral-6 transition-colors" title="刷新">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button onClick={onCreateFile} className="p-1 rounded hover:bg-neutral-2 text-neutral-6 transition-colors" title="新建文件">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-neutral-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-6" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="搜索文件..."
            className="w-full pl-7 pr-7 py-1.5 text-copy-13 bg-neutral-2 border border-neutral-4 rounded-lg text-neutral-9 placeholder:text-neutral-6 focus:outline-none focus:border-accent/50"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-6 hover:text-neutral-8"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-7" />
          </div>
        ) : error ? (
          <div className="px-3 py-4 text-label-12 text-neutral-6 text-center">{error}</div>
        ) : filteredFiles.length === 0 ? (
          <div className="px-3 py-4 text-label-12 text-neutral-6 text-center">
            {filter ? '无匹配文件' : '暂无文件'}
          </div>
        ) : (
          filteredFiles.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              activeFilePath={activeFilePath}
              onSelect={onFileSelect}
              filter={filter}
            />
          ))
        )}
      </div>
    </div>
  );
}

function getDefaultFiles(): FileNode[] {
  return [
    {
      id: '_default_src',
      name: 'src',
      path: 'src',
      type: 'directory',
      children: [
        { id: '_default_index', name: 'index.ts', path: 'src/index.ts', type: 'file' },
        { id: '_default_app', name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
      ],
    },
    {
      id: '_default_pkg',
      name: 'package.json',
      path: 'package.json',
      type: 'file',
    },
  ];
}

export function getLanguageFromFile(path: string): string {
  return getLanguageFromFilename(path.split('/').pop() || '');
}
