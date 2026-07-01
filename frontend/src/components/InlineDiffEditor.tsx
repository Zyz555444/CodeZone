'use client';

import React, { useCallback } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { Check, X, ChevronRight, CheckCheck } from 'lucide-react';
import type { DiffFile } from '@/stores/aiStore';
import { getLanguageFromFile } from './FileTree';

interface InlineDiffEditorProps {
  files: DiffFile[];
  onAccept: (filePath: string) => void;
  onReject: (filePath: string) => void;
  onSkip: () => void;
  onAcceptAll: () => void;
  onClose: () => void;
  visible: boolean;
}

export function InlineDiffEditor({
  files,
  onAccept,
  onReject,
  onSkip,
  onAcceptAll,
  onClose,
  visible,
}: InlineDiffEditorProps) {
  const { theme } = useTheme();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key === 'y') {
      e.preventDefault();
      if (e.shiftKey) {
        onAcceptAll();
      } else if (files.length > 0) {
        const current = files[0];
        if (current && current.accepted === null) {
          onAccept(current.filePath);
        }
      }
    } else if (meta && e.key === 'n') {
      e.preventDefault();
      if (files.length > 0) {
        const current = files[0];
        if (current && current.accepted === null) {
          onReject(current.filePath);
        }
      }
    } else if (!e.shiftKey && !e.metaKey && !e.ctrlKey && e.key === 'ArrowRight') {
      e.preventDefault();
      onSkip();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [files, onAccept, onReject, onSkip, onAcceptAll, onClose]);

  React.useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  if (!visible || files.length === 0) return null;

  const pendingFiles = files.filter((f) => f.accepted === null);
  const currentFile = pendingFiles[0] || files[0];

  if (!currentFile) return null;

  return (
    <div className="border-t border-neutral-4 bg-neutral-1" style={{ height: '40%' }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-4 bg-neutral-2">
        <div className="flex items-center gap-2">
          <span className="text-label-12 text-neutral-7 font-mono">{currentFile.filePath}</span>
          <span className="text-label-12 text-neutral-6">
            ({pendingFiles.length}/{files.length} 待处理)
          </span>
        </div>
        <div className="flex items-center gap-1 text-label-12 text-neutral-6">
          <kbd className="px-1 py-0.5 bg-neutral-3 rounded text-neutral-7 font-mono text-caption-10">Cmd+Y</kbd>
          <span>接受</span>
          <kbd className="px-1 py-0.5 bg-neutral-3 rounded text-neutral-7 font-mono text-caption-10">Cmd+N</kbd>
          <span>拒绝</span>
          <kbd className="px-1 py-0.5 bg-neutral-3 rounded text-neutral-7 font-mono text-caption-10">&rarr;</kbd>
          <span>跳过</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAccept(currentFile.filePath)}
            className="flex items-center gap-1 px-2 py-1 text-label-12 rounded-md bg-success text-white hover:bg-success/80 transition-colors"
          >
            <Check className="h-3 w-3" />
            <span>接受</span>
          </button>
          <button
            onClick={() => onReject(currentFile.filePath)}
            className="flex items-center gap-1 px-2 py-1 text-label-12 rounded-md bg-neutral-4 text-neutral-8 hover:bg-neutral-5 transition-colors"
          >
            <X className="h-3 w-3" />
            <span>拒绝</span>
          </button>
          <button
            onClick={onSkip}
            className="flex items-center gap-1 px-2 py-1 text-label-12 rounded-md bg-neutral-3 text-neutral-7 hover:bg-neutral-4 transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
          <button
            onClick={onAcceptAll}
            className="flex items-center gap-1 px-2 py-1 text-label-12 rounded-md bg-neutral-3 text-neutral-7 hover:bg-neutral-4 transition-colors"
          >
            <CheckCheck className="h-3 w-3" />
            <span>全部接受</span>
          </button>
        </div>
      </div>
      <div style={{ height: 'calc(100% - 33px)' }}>
        <DiffEditor
          original={currentFile.oldContent || ''}
          modified={currentFile.newContent}
          language={getLanguageFromFile(currentFile.filePath)}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: 'on',
            renderOverviewRuler: false,
          }}
        />
      </div>
    </div>
  );
}
