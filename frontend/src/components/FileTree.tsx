'use client';

import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, File, FileCode, FileText, FileJson, ChevronRight, Loader2, Plus, RefreshCw } from 'lucide-react';
import { apiUrl } from '@/lib/env';
import { authFetch } from '@/lib/utils';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export type { FileNode };

interface FileTreeProps {
  projectId: string;
  onFileSelect: (file: FileNode) => void;
  activeFilePath?: string;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  ts: <FileCode className="h-3.5 w-3.5 text-blue-500" />,
  tsx: <FileCode className="h-3.5 w-3.5 text-cyan-500" />,
  js: <FileCode className="h-3.5 w-3.5 text-yellow-500" />,
  jsx: <FileCode className="h-3.5 w-3.5 text-cyan-400" />,
  json: <FileJson className="h-3.5 w-3.5 text-yellow-600" />,
  md: <FileText className="h-3.5 w-3.5 text-neutral-6" />,
  css: <FileText className="h-3.5 w-3.5 text-sky-500" />,
  scss: <FileText className="h-3.5 w-3.5 text-pink-500" />,
  html: <FileCode className="h-3.5 w-3.5 text-orange-500" />,
  prisma: <FileCode className="h-3.5 w-3.5 text-purple-500" />,
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
}: {
  node: FileNode;
  depth: number;
  activeFilePath?: string;
  onSelect: (file: FileNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-left text-sm text-neutral-7 hover:bg-neutral-2 rounded transition-colors"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          {expanded ? <FolderOpen className="h-3.5 w-3.5 text-accent/70" /> : <Folder className="h-3.5 w-3.5 text-accent/50" />}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children?.map((child, i) => (
          <FileTreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            activeFilePath={activeFilePath}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node)}
      className={`flex items-center gap-1.5 w-full px-2 py-1 text-left text-sm rounded transition-colors ${
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

export function FileTree({ projectId, onFileSelect, activeFilePath }: FileTreeProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(apiUrl(`/api/code/${projectId}/tree`));
      if (!res.ok) throw new Error('加载文件树失败');
      const data = await res.json();
      setFiles(data.tree || data.files || []);
    } catch (e: any) {
      setError(e.message);
      setFiles(getDefaultFiles());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-3">
        <span className="text-xs font-medium text-neutral-7 uppercase tracking-wider">文件</span>
        <div className="flex items-center gap-1">
          <button onClick={fetchFiles} className="p-1 rounded hover:bg-neutral-2 text-neutral-6 transition-colors" title="刷新">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button className="p-1 rounded hover:bg-neutral-2 text-neutral-6 transition-colors" title="新建文件">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-5" />
          </div>
        ) : error ? (
          <div className="px-3 py-4 text-xs text-neutral-6 text-center">{error}</div>
        ) : (
          files.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              activeFilePath={activeFilePath}
              onSelect={onFileSelect}
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
      name: 'src',
      path: 'src',
      type: 'directory',
      children: [
        { name: 'index.ts', path: 'src/index.ts', type: 'file' },
        { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
      ],
    },
    {
      name: 'package.json',
      path: 'package.json',
      type: 'file',
    },
  ];
}

export function getLanguageFromFile(path: string): string {
  return getLanguageFromFilename(path.split('/').pop() || '');
}
