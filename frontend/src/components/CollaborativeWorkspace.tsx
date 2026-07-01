'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CollaborativeEditor } from './CollaborativeEditor';
import { FileTree, FileNode, getLanguageFromFile } from './FileTree';
import { AIAgentPanel } from './AIPanel';
import { TerminalPanel } from './TerminalPanel';
import { InlineAIMenu } from './InlineAIMenu';
import { InlineDiffEditor } from './InlineDiffEditor';
import { NewFileModal } from './NewFileModal';
import { EditorCommandProvider, useEditorCommandBus, type EditorCommand } from './EditorCommandBus';
import { X, Plus, Sparkles, PanelRight, PanelLeft, Terminal, Loader2, Save, Circle } from 'lucide-react';
import { apiUrl } from '@/lib/env';
import { authFetch } from '@/lib/utils';
import { agentExecute, type AIError } from '@/lib/ai';
import type { editor } from 'monaco-editor';
import type { DiffFile } from '@/stores/aiStore';

interface OpenFile {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  language: string;
  fileId: string;
}

interface CollaborativeWorkspaceProps {
  projectId: string;
}

function WorkspaceInner({ projectId }: CollaborativeWorkspaceProps) {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showFileTree, setShowFileTree] = useState(true);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [diffFiles, setDiffFiles] = useState<DiffFile[]>([]);
  const [showInlineDiff, setShowInlineDiff] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dirtyFileIds, setDirtyFileIds] = useState<Set<string>>(new Set());
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; fileId: string } | null>(null);

  const [inlineMenu, setInlineMenu] = useState<{
    selectedText: string;
    language: string;
    top: number;
    left: number;
  } | null>(null);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { setCommandHandler, emitEvent } = useEditorCommandBus();

  const activeFile = openFiles.find(f => f.fileId === activeFileId);

  const openFileByPath = useCallback(async (filePath: string, line?: number, column?: number) => {
    const existing = openFiles.find(f => f.path === filePath);
    if (existing) {
      setActiveFileId(existing.fileId);
      if (line && editorRef.current) {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: column || 1 });
      }
      return;
    }

    try {
      const res = await authFetch(apiUrl(`/api/code/files?projectId=${projectId}`));
      if (!res.ok) return;
      const data = await res.json();
      const target = (data.files || []).find((f: { path?: string; id?: string }) => f.path === filePath);
      if (!target?.id) return;

      const fileRes = await authFetch(apiUrl(`/api/code/files/${target.id}`));
      if (!fileRes.ok) return;
      const fileData = await fileRes.json();
      const content = fileData.file?.content || '';

      const newFile: OpenFile = {
        path: filePath,
        name: filePath.split('/').pop() || filePath,
        content,
        originalContent: content,
        language: getLanguageFromFile(filePath),
        fileId: `${projectId}:${target.id}`,
      };

      setOpenFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.fileId);

      if (line && editorRef.current) {
        setTimeout(() => {
          editorRef.current?.revealLineInCenter(line);
          editorRef.current?.setPosition({ lineNumber: line, column: column || 1 });
        }, 100);
      }
    } catch {
      // silent
    }
  }, [openFiles, projectId]);

  const replaceSelection = useCallback((text: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    if (selection && !selection.isEmpty()) {
      editor.executeEdits('ai-inline-menu', [{ range: selection, text }]);
    }
  }, []);

  const addDiffFile = useCallback((filePath: string, oldContent: string, newContent: string) => {
    setDiffFiles(prev => {
      const filtered = prev.filter(f => f.filePath !== filePath);
      return [...filtered, { filePath, oldContent, newContent, accepted: null }];
    });
    setShowInlineDiff(true);
  }, []);

  const handleCommand = useCallback((cmd: EditorCommand) => {
    switch (cmd.type) {
      case 'goto': {
        const { filePath, line, column } = cmd.payload;
        if (typeof filePath === 'string') {
          openFileByPath(filePath, typeof line === 'number' ? line : undefined, typeof column === 'number' ? column : undefined);
        }
        break;
      }
      case 'diff': {
        const { filePath, old, new: newContent } = cmd.payload;
        const path = typeof filePath === 'string' ? filePath : (activeFile?.path || 'selected');
        const oldContent = typeof old === 'string' ? old : '';
        const modified = typeof newContent === 'string' ? newContent : '';
        addDiffFile(path, oldContent, modified);
        break;
      }
      case 'replace': {
        const { text } = cmd.payload;
        if (typeof text === 'string') {
          replaceSelection(text);
        }
        break;
      }
      case 'focus': {
        editorRef.current?.focus();
        break;
      }
      case 'agent_start': {
        setAgentRunning(true);
        setAgentError(null);
        break;
      }
      case 'agent_done': {
        setAgentRunning(false);
        break;
      }
    }
  }, [openFileByPath, activeFile?.path, addDiffFile, replaceSelection]);

  const handleCommandRef = useRef(handleCommand);
  useEffect(() => {
    handleCommandRef.current = handleCommand;
  });

  useEffect(() => {
    setCommandHandler((cmd) => handleCommandRef.current(cmd));
  }, [setCommandHandler]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (agentRunning) return;
        const editor = editorRef.current;
        if (!editor || !activeFile) return;
        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) {
          const selText = editor.getModel()?.getValueInRange(selection) || '';
          const rect = document.querySelector('.monaco-editor')?.getBoundingClientRect();
          setInlineMenu({
            selectedText: selText,
            language: activeFile.language,
            top: rect ? rect.top + 50 : 100,
            left: rect ? rect.left + (rect.width / 2) - 100 : 200,
          });
        } else {
          setInlineMenu(null);
          startInlineAgent('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, agentRunning]);

  const startInlineAgent = useCallback((prompt: string) => {
    if (agentRunning || !activeFile) return;

    const task = prompt || '根据当前文件内容，帮我优化或修复代码';
    setAgentRunning(true);
    setAgentError(null);
    emitEvent({ type: 'ctrl_k_prompt', payload: { text: task } });

    const abortController = new AbortController();
    abortRef.current = abortController;

    const collectedDiffs = new Map<string, { oldContent: string; newContent: string }>();

    agentExecute(
      {
        task,
        projectId,
        contextFiles: activeFile ? [activeFile.fileId] : undefined,
      },
      {
        onToken: () => {},
        onThinking: () => {},
        onToolCall: () => {},
        onToolResult: () => {},
        onWriteFile: (filePath, newContent, patch) => {
          const old = patch?.old || '';
          collectedDiffs.set(filePath, { oldContent: old, newContent });
          addDiffFile(filePath, old, newContent);
        },
        onDone: () => {
          setAgentRunning(false);
          abortRef.current = null;
          emitEvent({ type: 'agent_abort', payload: {} });
        },
        onError: (err: AIError) => {
          setAgentError(err.suggestion ? `${err.message}。${err.suggestion}` : err.message);
          setAgentRunning(false);
          abortRef.current = null;
          emitEvent({ type: 'agent_abort', payload: {} });
        },
      },
      abortController.signal,
    ).catch(() => {
      setAgentRunning(false);
      abortRef.current = null;
    });
  }, [activeFile, agentRunning, projectId, emitEvent, addDiffFile]);

  const handleStopAgent = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setAgentRunning(false);
    emitEvent({ type: 'agent_abort', payload: {} });
  }, [emitEvent]);

  const handleEditorMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Ctrl+K inline prompt is handled by the window keydown listener so it works
    // even when the editor does not have focus.
  }, []);

  const handleFileSelect = useCallback(async (node: FileNode) => {
    if (node.type !== 'file') return;

    const existingIdx = openFiles.findIndex(f => f.path === node.path);
    if (existingIdx >= 0) {
      setActiveFileId(openFiles[existingIdx].fileId);
      return;
    }

    const fileId = `${projectId}:${node.id}`;
    let content = '';

    try {
      const res = await authFetch(apiUrl(`/api/code/files/${node.id}`));
      if (res.ok) {
        const data = await res.json();
        content = data.file?.content || '';
      }
    } catch {
      console.warn('Failed to load file content:', node.path);
    }

    const newFile: OpenFile = {
      path: node.path,
      name: node.name,
      content,
      originalContent: content,
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
    setDirtyFileIds(prev => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
  }, [activeFileId]);

  const handleContentChange = useCallback((fileId: string, content: string) => {
    setOpenFiles(prev => prev.map(f =>
      f.fileId === fileId ? { ...f, content } : f
    ));
    setDirtyFileIds(prev => {
      const file = openFiles.find(f => f.fileId === fileId);
      const isDirty = file ? content !== file.originalContent : false;
      const next = new Set(prev);
      if (isDirty) next.add(fileId);
      else next.delete(fileId);
      return next;
    });
  }, [openFiles]);

  const handleAcceptDiff = useCallback(async (filePath: string) => {
    const file = diffFiles.find(f => f.filePath === filePath);
    if (!file) return;

    try {
      const res = await authFetch(apiUrl(`/api/code/files?projectId=${projectId}`));
      if (!res.ok) return;
      const data = await res.json();
      const target = (data.files || []).find((f: { path?: string; id?: string }) => f.path === filePath);
      if (!target?.id) return;

      await authFetch(apiUrl(`/api/code/files/${target.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: file.newContent }),
      });

      const acceptedFileId = `${projectId}:${target.id}`;
      setOpenFiles(prev => prev.map(f =>
        f.fileId === acceptedFileId
          ? { ...f, content: file.newContent, originalContent: file.newContent }
          : f
      ));
      setDirtyFileIds(prev => {
        const next = new Set(prev);
        next.delete(acceptedFileId);
        return next;
      });
      setDiffFiles(prev => prev.map(f =>
        f.filePath === filePath ? { ...f, accepted: true } : f
      ));
    } catch {
      // silent
    }
  }, [diffFiles, projectId]);

  const handleRejectDiff = useCallback((filePath: string) => {
    setDiffFiles(prev => prev.map(f =>
      f.filePath === filePath ? { ...f, accepted: false } : f
    ));
  }, []);

  const handleSkipDiff = useCallback(() => {
    const pending = diffFiles.filter(f => f.accepted === null);
    if (pending.length <= 1) {
      setShowInlineDiff(false);
    }
  }, [diffFiles]);

  const handleAcceptAllDiffs = useCallback(async () => {
    const pending = diffFiles.filter(f => f.accepted === null);
    for (const file of pending) {
      await handleAcceptDiff(file.filePath);
    }
  }, [diffFiles, handleAcceptDiff]);

  const pendingDiffCount = useMemo(() => diffFiles.filter(f => f.accepted === null).length, [diffFiles]);

  const handleSaveActiveFile = useCallback(async () => {
    if (!activeFile) return;
    try {
      const res = await authFetch(apiUrl(`/api/code/files?projectId=${projectId}`));
      if (!res.ok) return;
      const data = await res.json();
      const target = (data.files || []).find((f: { path?: string; id?: string }) => f.path === activeFile.path);
      if (!target?.id) return;

      await authFetch(apiUrl(`/api/code/files/${target.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: activeFile.content }),
      });

      setOpenFiles(prev => prev.map(f =>
        f.fileId === activeFile.fileId ? { ...f, originalContent: activeFile.content } : f
      ));
      setDirtyFileIds(prev => {
        const next = new Set(prev);
        next.delete(activeFile.fileId);
        return next;
      });
    } catch {
      // silent
    }
  }, [activeFile, projectId]);

  const handleCreateFile = useCallback(async (name: string, type: 'FILE' | 'DIRECTORY') => {
    try {
      const res = await authFetch(apiUrl('/api/code/files'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name, type }),
      });
      if (!res.ok) return;
      setRefreshKey(k => k + 1);
    } catch {
      // silent
    }
  }, [projectId]);

  const closeOtherFiles = useCallback((keepFileId: string) => {
    setOpenFiles(prev => prev.filter(f => f.fileId === keepFileId));
    if (activeFileId !== keepFileId) {
      setActiveFileId(keepFileId);
    }
    setDirtyFileIds(prev => {
      const next = new Set<string>();
      if (prev.has(keepFileId)) next.add(keepFileId);
      return next;
    });
  }, [activeFileId]);

  const closeAllFiles = useCallback(() => {
    setOpenFiles([]);
    setActiveFileId('');
    setDirtyFileIds(new Set());
  }, []);

  useEffect(() => {
    if (!tabContextMenu) return;
    const close = () => setTabContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [tabContextMenu]);

  return (
    <div className="flex h-full bg-white">
      {showFileTree && (
        <div className="w-56 border-r border-neutral-3 flex-shrink-0 overflow-hidden">
          <FileTree
            projectId={projectId}
            onFileSelect={handleFileSelect}
            activeFilePath={activeFile?.path}
            onCreateFile={() => setShowNewFileModal(true)}
            refreshKey={refreshKey}
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
            {openFiles.map(file => {
              const isDirty = dirtyFileIds.has(file.fileId);
              return (
                <div
                  key={file.fileId}
                  className={`group flex items-center gap-1.5 px-3 py-2 text-copy-13 border-r border-neutral-3 cursor-pointer transition-colors shrink-0 ${
                    activeFileId === file.fileId
                      ? 'bg-white text-neutral-9 border-b-white -mb-[1px]'
                      : 'bg-neutral-1 text-neutral-6 hover:bg-neutral-2'
                  }`}
                  onClick={() => setActiveFileId(file.fileId)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setTabContextMenu({ x: e.clientX, y: e.clientY, fileId: file.fileId });
                  }}
                >
                  <span className="truncate max-w-[140px]">{file.name}</span>
                  {isDirty && <Circle className="h-1.5 w-1.5 fill-amber-500 text-amber-500" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCloseFile(file.fileId); }}
                    className="p-0.5 rounded hover:bg-neutral-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center px-2 gap-1">
            {agentRunning && (
              <div className="flex items-center gap-1.5 px-2 py-1 mr-1 bg-accent/10 backdrop-blur-sm rounded-lg border border-accent/20">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                <span className="text-label-12 text-accent">Agent 执行中...</span>
                <button onClick={handleStopAgent} className="ml-1 text-label-12 text-neutral-6 hover:text-neutral-9">
                  Esc 取消
                </button>
              </div>
            )}
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`flex items-center gap-1 px-2 py-1.5 text-label-12 rounded-lg transition-colors ${
                showAIPanel
                  ? 'bg-accent/10 text-accent'
                  : 'text-neutral-6 hover:bg-neutral-2'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI
            </button>
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`flex items-center gap-1 px-2 py-1.5 text-label-12 rounded-lg transition-colors ${
                showTerminal
                  ? 'bg-accent/10 text-accent'
                  : 'text-neutral-6 hover:bg-neutral-2'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              终端
            </button>
            {activeFile && (
              <button
                onClick={handleSaveActiveFile}
                disabled={!dirtyFileIds.has(activeFile.fileId)}
                className="flex items-center gap-1 px-2 py-1.5 text-label-12 rounded-lg text-neutral-6 hover:bg-neutral-2 transition-colors disabled:opacity-50"
                title="保存 (Ctrl+S)"
              >
                <Save className="h-3.5 w-3.5" />
                保存
              </button>
            )}
            <button
              onClick={() => setShowNewFileModal(true)}
              className="flex items-center gap-1 px-2 py-1.5 text-label-12 rounded-lg text-neutral-6 hover:bg-neutral-2 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              新文件
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0 relative">
          <div className="flex-1 min-w-0 flex flex-col">
            {activeFile ? (
              <div className="flex-1 min-h-0">
                <CollaborativeEditor
                  key={activeFile.fileId}
                  projectId={projectId}
                  fileId={activeFile.path}
                  initialContent={activeFile.content}
                  language={activeFile.language}
                  onContentChange={(content) => handleContentChange(activeFile.fileId, content)}
                  onMount={handleEditorMount}
                  onSave={handleSaveActiveFile}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-6">
                <div className="text-center">
                  <PanelRight className="h-12 w-12 mx-auto mb-3 text-neutral-4" />
                  <p className="text-copy-13 font-medium text-neutral-7 mb-1">选择文件开始编辑</p>
                  <p className="text-label-12 text-neutral-7">从左侧文件树选择文件，或创建新文件</p>
                  <p className="text-label-12 text-neutral-7 mt-2">
                    选中代码后按 <kbd className="px-1 py-0.5 bg-neutral-2 rounded text-accent">Ctrl+K</kbd> 打开 AI 菜单
                  </p>
                </div>
              </div>
            )}

            {agentError && (
              <div className="px-3 py-2 bg-red-50 border-t border-red-200 text-label-12 text-red-600 shrink-0">
                {agentError}
                <button onClick={() => setAgentError(null)} className="ml-2 underline">关闭</button>
              </div>
            )}

            <InlineDiffEditor
              files={diffFiles}
              visible={showInlineDiff && pendingDiffCount > 0}
              onAccept={handleAcceptDiff}
              onReject={handleRejectDiff}
              onSkip={handleSkipDiff}
              onAcceptAll={handleAcceptAllDiffs}
              onClose={() => setShowInlineDiff(false)}
            />
          </div>

          {inlineMenu && (
            <InlineAIMenu
              selectedText={inlineMenu.selectedText}
              language={inlineMenu.language}
              position={{ top: inlineMenu.top, left: inlineMenu.left }}
              onClose={() => setInlineMenu(null)}
              projectId={projectId}
            />
          )}

          {showAIPanel && (
            <AIAgentPanel
              projectId={projectId}
              onClose={() => setShowAIPanel(false)}
              position="right"
            />
          )}
        </div>

        <TerminalPanel
          projectId={projectId}
          visible={showTerminal}
          onClose={() => setShowTerminal(false)}
        />
      </div>

      {tabContextMenu && (
        <div
          className="fixed z-50 bg-white border border-neutral-4 rounded-lg shadow-float py-1 min-w-[140px]"
          style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
        >
          <button
            onClick={() => { handleCloseFile(tabContextMenu.fileId); setTabContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-copy-13 text-neutral-8 hover:bg-neutral-2"
          >
            关闭
          </button>
          <button
            onClick={() => { closeOtherFiles(tabContextMenu.fileId); setTabContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-copy-13 text-neutral-8 hover:bg-neutral-2"
          >
            关闭其他
          </button>
          <button
            onClick={() => { closeAllFiles(); setTabContextMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-copy-13 text-neutral-8 hover:bg-neutral-2"
          >
            关闭全部
          </button>
        </div>
      )}

      <NewFileModal
        isOpen={showNewFileModal}
        onClose={() => setShowNewFileModal(false)}
        projectId={projectId}
        onCreateFile={handleCreateFile}
      />
    </div>
  );
}

export function CollaborativeWorkspace(props: CollaborativeWorkspaceProps) {
  return (
    <EditorCommandProvider>
      <WorkspaceInner {...props} />
    </EditorCommandProvider>
  );
}
