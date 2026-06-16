'use client';

import React, { useState, useCallback } from 'react';
import { CollaborativeEditorCore } from './CollaborativeEditorCore';
import { FileTree, FileNode, getLanguageFromFile } from './FileTree';
import { AIPanel } from './AIPanel';
import { X, Plus, Sparkles, PanelRight, PanelLeft } from 'lucide-react';
import { apiUrl } from '@/lib/env';

function getToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)auth-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  fileId: string;
}

interface CollaborativeWorkspaceProps {
  projectId: string;
  wsUrl?: string;
}

export function CollaborativeWorkspace({ projectId, wsUrl }: CollaborativeWorkspaceProps) {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showFileTree, setShowFileTree] = useState(true);

  const activeFile = openFiles.find(f => f.fileId === activeFileId);

  const handleFileSelect = useCallback(async (node: FileNode) => {
    if (node.type !== 'file') return;

    const existingIdx = openFiles.findIndex(f => f.path === node.path);
    if (existingIdx >= 0) {
      setActiveFileId(openFiles[existingIdx].fileId);
      return;
    }

    const fileId = `${projectId}:${node.path}`;
    let content = '';

    try {
      const token = getToken();
      const res = await fetch(apiUrl(`/api/code/${projectId}/file?path=${encodeURIComponent(node.path)}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        content = data.content || '';
      }
    } catch {
      console.warn('Failed to load file content:', node.path);
    }

    const newFile: OpenFile = {
      path: node.path,
      name: node.name,
      content,
      language: getLanguageFromFile(node.path),
      fileId,
    };

    setOpenFiles(prev => [...prev, newFile]);
    setActiveFileId(fileId);
  }, [openFiles, projectId]);

  const handleCloseFile = useCallback((fileId: string) => {
    setOpenFiles(prev => {
      const idx = prev.findIndex(f => f.fileId === fileId);
      const newFiles = prev.filter(f => f.fileId !== fileId);
      if (activeFileId === fileId && newFiles.length > 0) {
        const nextIdx = Math.min(idx, newFiles.length - 1);
        setActiveFileId(newFiles[nextIdx].fileId);
      } else if (newFiles.length === 0) {
        setActiveFileId('');
      }
      return newFiles;
    });
  }, [activeFileId]);

  const handleInsertCode = useCallback((code: string) => {
    if (activeFile) {
      const editor = document.querySelector('.monaco-editor') as HTMLElement;
      if (editor) {
        navigator.clipboard.writeText(code);
      }
      setOpenFiles(prev => prev.map(f =>
        f.fileId === activeFile.fileId
          ? { ...f, content: f.content + '\n' + code }
          : f
      ));
    }
  }, [activeFile]);

  const handleContentChange = useCallback((fileId: string, content: string) => {
    setOpenFiles(prev => prev.map(f =>
      f.fileId === fileId ? { ...f, content } : f
    ));
  }, []);

  return (
    <div className="flex h-full bg-white">
      {showFileTree && (
        <div className="w-56 border-r border-neutral-3 flex-shrink-0 overflow-hidden">
          <FileTree
            projectId={projectId}
            onFileSelect={handleFileSelect}
            activeFilePath={activeFile?.path}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center border-b border-neutral-3 bg-neutral-1 shrink-0">
          <button
            onClick={() => setShowFileTree(!showFileTree)}
            className="p-2 hover:bg-neutral-2 text-neutral-6 transition-colors"
            title="切换文件树"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide">
            {openFiles.map(file => (
              <div
                key={file.fileId}
                className={`group flex items-center gap-1.5 px-3 py-2 text-sm border-r border-neutral-3 cursor-pointer transition-colors shrink-0 ${
                  activeFileId === file.fileId
                    ? 'bg-white text-neutral-9 border-b-white -mb-[1px]'
                    : 'bg-neutral-1 text-neutral-6 hover:bg-neutral-2'
                }`}
                onClick={() => setActiveFileId(file.fileId)}
              >
                <span className="truncate max-w-[140px]">{file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCloseFile(file.fileId); }}
                  className="p-0.5 rounded hover:bg-neutral-3 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center px-2 gap-1">
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                showAIPanel
                  ? 'bg-accent/10 text-accent'
                  : 'text-neutral-6 hover:bg-neutral-2'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI
            </button>
            <button
              onClick={() => setShowFileTree(!showFileTree)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg text-neutral-6 hover:bg-neutral-2 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              新文件
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0">
            {activeFile ? (
              <CollaborativeEditorCore
                key={activeFile.fileId}
                projectId={projectId}
                fileId={activeFile.path}
                initialContent={activeFile.content}
                language={activeFile.language}
                wsUrl={wsUrl}
                onContentChange={(content) => handleContentChange(activeFile.fileId, content)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-6">
                <div className="text-center">
                  <PanelRight className="h-12 w-12 mx-auto mb-3 text-neutral-4" />
                  <p className="text-sm font-medium text-neutral-7 mb-1">选择文件开始编辑</p>
                  <p className="text-xs text-neutral-5">从左侧文件树选择文件，或创建新文件</p>
                </div>
              </div>
            )}
          </div>

          {showAIPanel && activeFile && (
            <AIPanel
              code={activeFile.content}
              language={activeFile.language}
              onInsertCode={handleInsertCode}
              onClose={() => setShowAIPanel(false)}
              position="right"
            />
          )}
        </div>
      </div>
    </div>
  );
}
