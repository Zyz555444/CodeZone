'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, File, Folder, FolderOpen, ChevronRight, ChevronDown, Search } from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';
import { NewFileModal } from '@/components/NewFileModal';
import { CodeEditor } from '@/components/CodeEditor';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';

interface FileNode {
  id: string;
  name: string;
  type: 'FILE' | 'DIRECTORY';
  children?: FileNode[];
  language?: string;
  content?: string;
}

function getLanguage(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    scss: 'scss',
    html: 'html',
    md: 'markdown',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    sh: 'shell',
    bash: 'shell',
  };
  return map[ext || ''] || 'plaintext';
}

export default function CodePage() {
  const { user } = useAuthStore();
  const { currentProject } = useProjectStore();
  const selectedProjectId = currentProject?.id;
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileParentId, setNewFileParentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      setIsLoading(false);
      setLoadError('请先在项目页面选择一个项目');
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    api
      .get(`/code/files`, { params: { projectId: selectedProjectId } })
      .then((res) => {
        const fileTree = res.data?.files || [];
        setFiles(fileTree);

        const rootFolders = new Set<string>();
        fileTree.forEach((node: FileNode) => {
          if (node.type === 'DIRECTORY') {
            rootFolders.add(node.id);
          }
        });
        setExpandedFolders(rootFolders);
      })
      .catch((err) => {
        console.error('获取文件树失败:', err);
        setLoadError('获取文件列表失败，请检查后端服务是否运行');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedFileId) return;

    const loadFileContent = (nodes: FileNode[]): string | null => {
      for (const node of nodes) {
        if (node.id === selectedFileId) return node.content || '';
        if (node.children) {
          const found = loadFileContent(node.children);
          if (found !== null) return found;
        }
      }
      return null;
    };

    const cached = loadFileContent(files);
    if (cached !== null) {
      setSelectedFileContent(cached);
      return;
    }

    api
      .get(`/code/files/${selectedFileId}`)
      .then((res) => {
        setSelectedFileContent(res.data?.file?.content || '');
      })
      .catch(() => {
        setSelectedFileContent('');
      });
  }, [selectedFileId, files]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleSelectFile = (node: FileNode) => {
    if (node.type === 'DIRECTORY') {
      toggleFolder(node.id);
    } else {
      setSelectedFileId(node.id);
    }
  };

  const handleCloseTab = () => {
    setSelectedFileId(null);
    setSelectedFileContent('');
  };

  const handleCreateFile = async (name: string, type: 'FILE' | 'DIRECTORY') => {
    if (!selectedProjectId) return;

    const language = type === 'FILE' ? getLanguage(name) : undefined;
    const parentPath = newFileParentId
      ? files.find((f) => f.id === newFileParentId)?.name || ''
      : '';
    const fullPath = parentPath ? `${parentPath}/${name}` : name;

    try {
      const res = await api.post('/files/files', {
        projectId: selectedProjectId,
        name,
        path: fullPath,
        type,
        parentId: newFileParentId || null,
        language,
        content: '',
      });

      if (res.data?.file) {
        const refetch = await api.get(`/code/files`, { params: { projectId: selectedProjectId } });
        setFiles(refetch.data?.files || []);
      }
    } catch (err) {
      console.error('创建文件失败:', err);
    }
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;

    const filter = (nodes: FileNode[]): FileNode[] => {
      return nodes.reduce<FileNode[]>((acc, node) => {
        const matchesName = node.name.toLowerCase().includes(searchQuery.toLowerCase());
        const filteredChildren = node.children ? filter(node.children) : [];

        if (matchesName || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
          });
        }
        return acc;
      }, []);
    };

    return filter(files);
  }, [files, searchQuery]);

  const selectedFileNode = useMemo(() => {
    if (!selectedFileId) return null;
    const findFile = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.id === selectedFileId) return node;
        if (node.children) {
          const found = findFile(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findFile(files);
  }, [files, selectedFileId]);

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.id}>
        <button
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
            selectedFileId === node.id
              ? 'bg-neutral-2 text-neutral-10 font-medium'
              : 'text-neutral-7 hover:text-neutral-9 hover:bg-neutral-2'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => handleSelectFile(node)}
        >
          {node.type === 'DIRECTORY' ? (
            <>
              {expandedFolders.has(node.id) ? (
                <ChevronDown className="h-4 w-4 text-neutral-6 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-neutral-6 shrink-0" />
              )}
              {expandedFolders.has(node.id) ? (
                <FolderOpen className="h-4 w-4 text-accent shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-accent shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-4 shrink-0" />
              <File className="h-4 w-4 text-neutral-5 shrink-0" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.type === 'DIRECTORY' && expandedFolders.has(node.id) && node.children && (
          <div>{renderFileTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <TeamGuard>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex overflow-hidden">
              <div className="w-64 border-r border-neutral-5 bg-neutral-1 shrink-0 flex flex-col">
                <div className="p-4 border-b border-neutral-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-6" />
                    <Input
                      placeholder="搜索文件..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 bg-neutral-2"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full text-sm text-neutral-6">
                      加载中...
                    </div>
                  ) : loadError ? (
                    <div className="flex items-center justify-center h-full text-sm text-neutral-6 px-4 text-center">
                      {loadError}
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-neutral-6">
                      暂无文件
                    </div>
                  ) : (
                    renderFileTree(filteredFiles)
                  )}
                </div>
                <div className="p-3 border-t border-neutral-5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setNewFileParentId(null);
                      setShowNewFileModal(true);
                    }}
                    disabled={!selectedProjectId}
                  >
                    <Plus className="h-4 w-4" />
                    新建文件
                  </Button>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-neutral-1">
                <div className="h-12 border-b border-neutral-5 flex items-center px-4 gap-2 bg-neutral-2/50 overflow-x-auto">
                  {selectedFileNode && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-1 rounded-t-lg border-t border-l border-r border-neutral-5 shrink-0">
                      <File className="h-4 w-4 text-neutral-6" />
                      <span className="text-sm">{selectedFileNode.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-1"
                        onClick={handleCloseTab}
                      >
                        <span className="text-neutral-5">&times;</span>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex bg-neutral-1">
                  {selectedFileId && selectedProjectId ? (
                    <CodeEditor
                      projectId={selectedProjectId}
                      fileId={selectedFileId}
                      initialContent={selectedFileContent}
                      language={selectedFileNode?.language || getLanguage(selectedFileNode?.name || '')}
                      height="100%"
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center text-neutral-7">
                      <div>
                        <File className="h-12 w-12 mx-auto mb-4 text-neutral-5" />
                        <p>选择文件开始编辑</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-7 border-t border-neutral-5 bg-neutral-2 flex items-center justify-between px-4 text-xs text-neutral-7 shrink-0">
                  <div className="flex items-center gap-4">
                    <span>{selectedFileNode?.language || getLanguage(selectedFileNode?.name || '') || '--'}</span>
                    <span>UTF-8</span>
                    <span>LF</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>Spaces: 2</span>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      <NewFileModal
        isOpen={showNewFileModal}
        onClose={() => setShowNewFileModal(false)}
        projectId={selectedProjectId || ''}
        onCreateFile={handleCreateFile}
      />
    </TeamGuard>
  );
}
