'use client';

import React, { useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { FileText, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { getLanguageFromFile } from './FileTree';

interface FilePatch {
  filePath: string;
  oldContent?: string;
  newContent?: string;
  accepted: boolean | null;
}

interface FilePatchPreviewProps {
  patches: FilePatch[];
  onAccept: (filePath: string) => void;
  onReject: (filePath: string) => void;
}

export function FilePatchPreview({ patches, onAccept, onReject }: FilePatchPreviewProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (fp: string) => setExpanded((prev) => ({ ...prev, [fp]: !prev[fp] }));

  const pending = patches.filter((p) => p.accepted === null);
  const accepted = patches.filter((p) => p.accepted === true);
  const rejected = patches.filter((p) => p.accepted === false);

  if (patches.length === 0) return null;

  return (
    <div className="space-y-1 my-2">
      {[...pending, ...accepted, ...rejected].map((patch) => {
        const isOpen = !!expanded[patch.filePath];
        const fileName = patch.filePath.split('/').pop() || patch.filePath;
        const oldContent = patch.oldContent || '';
        const newContent = patch.newContent || '';

        return (
          <div key={patch.filePath} className="border border-neutral-4 rounded-lg overflow-hidden">
            <button
              onClick={() => toggle(patch.filePath)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-label-12 hover:bg-neutral-2 transition-colors"
            >
              {isOpen
                ? <ChevronDown className="h-3 w-3 text-neutral-6 shrink-0" />
                : <ChevronRight className="h-3 w-3 text-neutral-6 shrink-0" />
              }
              <FileText className="h-3.5 w-3.5 text-neutral-7 shrink-0" />
              <span className="font-medium text-neutral-8">{fileName}</span>
              <span className="text-neutral-6 truncate">{patch.filePath}</span>

              {patch.accepted === true && (
                <span className="ml-auto text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> 已接受
                </span>
              )}
              {patch.accepted === false && (
                <span className="ml-auto text-neutral-6 flex items-center gap-1">
                  <X className="h-3 w-3" /> 已拒绝
                </span>
              )}
              {patch.accepted === null && (
                <div className="ml-auto flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onAccept(patch.filePath)}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-label-12 rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    <Check className="h-3 w-3" /> 接受
                  </button>
                  <button
                    onClick={() => onReject(patch.filePath)}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-label-12 rounded bg-neutral-4 text-neutral-8 hover:bg-neutral-5"
                  >
                    <X className="h-3 w-3" /> 拒绝
                  </button>
                </div>
              )}
            </button>

            {isOpen && (
              <div className="px-2 pb-2" style={{ height: 280 }}>
                <DiffEditor
                  original={oldContent}
                  modified={newContent}
                  language={getLanguageFromFile(patch.filePath)}
                  theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                  options={{
                    readOnly: true,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 12,
                    lineNumbers: 'on',
                    renderOverviewRuler: false,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
