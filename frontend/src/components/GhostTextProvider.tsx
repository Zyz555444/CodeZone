'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { editor, languages, Position, CancellationToken, IRange } from 'monaco-editor';
import { authFetch } from '@/lib/utils';
import { apiUrl } from '@/lib/env';

interface GhostTextProviderProps {
  editor: editor.IStandaloneCodeEditor | null;
  monaco: typeof import('monaco-editor') | null;
  language: string;
  enabled?: boolean;
}

const DEBOUNCE_MS = 800;
const MAX_PREFIX_TOKENS = 4000;
const MAX_SUFFIX_TOKENS = 1000;
const CURSOR_DISCARD_THRESHOLD = 10;

export function GhostTextProvider({ editor: editorInst, monaco, language, enabled = true }: GhostTextProviderProps) {
  const providerRef = useRef<{ dispose: () => void } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingResolveRef = useRef<((value: languages.InlineCompletions) => void) | null>(null);
  const requestCursorRef = useRef<Position | null>(null);
  const statusWidgetRef = useRef<{ dispose: () => void } | null>(null);

  const estimateTokens = useCallback((text: string): number => {
    return Math.ceil(text.length / 4);
  }, []);

  const getGhostText = useCallback(
    async (prefix: string, suffix: string): Promise<string> => {
      try {
        if (abortRef.current) {
          abortRef.current.abort();
        }
        abortRef.current = new AbortController();

        const res = await authFetch(apiUrl('/api/ai/complete'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix, suffix, language }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) return '';
        const data = await res.json();
        return data.completion || '';
      } catch {
        return '';
      }
    },
    [language],
  );

  const showStatusMessage = useCallback((editor: editor.IStandaloneCodeEditor, message: string) => {
    statusWidgetRef.current?.dispose();
    const domNode = document.createElement('div');
    domNode.textContent = message;
    domNode.style.padding = '2px 8px';
    domNode.style.background = 'var(--vscode-editorHoverWidget-background, #252526)';
    domNode.style.color = 'var(--vscode-editorHoverWidget-foreground, #cccccc)';
    domNode.style.borderRadius = '3px';
    domNode.style.fontSize = '12px';
    domNode.style.pointerEvents = 'none';

    const contentWidget: editor.IContentWidget = {
      getId: () => 'ai-ghost-status',
      getDomNode: () => domNode,
      getPosition: () => ({
        position: editor.getPosition(),
        preference: [monaco?.editor.ContentWidgetPositionPreference.BELOW ?? 1],
      }),
    };

    editor.addContentWidget(contentWidget);
    statusWidgetRef.current = {
      dispose: () => editor.removeContentWidget(contentWidget),
    };

    setTimeout(() => {
      statusWidgetRef.current?.dispose();
      statusWidgetRef.current = null;
    }, 2000);
  }, [monaco]);

  useEffect(() => {
    if (!editorInst || !monaco || !enabled) return;

    const provider = monaco.languages.registerInlineCompletionsProvider(language, {
      provideInlineCompletions: async (
        model: editor.ITextModel,
        position: Position,
        _context: languages.InlineCompletionContext,
        token: CancellationToken,
      ) => {
        if (token.isCancellationRequested) return { items: [] as languages.InlineCompletion[] };

        const prefixLines = Math.min(MAX_PREFIX_TOKENS, position.lineNumber);
        const prefix = model.getValueInRange({
          startLineNumber: Math.max(1, position.lineNumber - prefixLines),
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        } as IRange);

        let prefixText = prefix;
        while (estimateTokens(prefixText) > MAX_PREFIX_TOKENS) {
          prefixText = prefixText.slice(prefixText.indexOf('\n') + 1);
        }

        const suffixStart = position.lineNumber;
        const suffixEnd = Math.min(model.getLineCount(), position.lineNumber + MAX_SUFFIX_TOKENS);
        const suffix = model.getValueInRange({
          startLineNumber: suffixStart,
          startColumn: position.column,
          endLineNumber: suffixEnd,
          endColumn: model.getLineMaxColumn(suffixEnd),
        } as IRange);

        let suffixText = suffix;
        while (estimateTokens(suffixText) > MAX_SUFFIX_TOKENS) {
          suffixText = suffixText.slice(0, suffixText.lastIndexOf('\n'));
        }

        return new Promise((resolve) => {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }
          if (pendingResolveRef.current) {
            pendingResolveRef.current({ items: [] as languages.InlineCompletion[] });
          }
          pendingResolveRef.current = resolve;
          requestCursorRef.current = position;

          timerRef.current = setTimeout(async () => {
            pendingResolveRef.current = null;
            if (token.isCancellationRequested) {
              resolve({ items: [] as languages.InlineCompletion[] });
              return;
            }

            const ghostText = await getGhostText(prefixText, suffixText);
            if (!ghostText || token.isCancellationRequested) {
              resolve({ items: [] as languages.InlineCompletion[] });
              return;
            }

            const currentPosition = editorInst.getPosition();
            if (requestCursorRef.current && currentPosition) {
              const startOffset = model.getOffsetAt(requestCursorRef.current);
              const currentOffset = model.getOffsetAt(currentPosition);
              if (Math.abs(currentOffset - startOffset) > CURSOR_DISCARD_THRESHOLD) {
                resolve({ items: [] as languages.InlineCompletion[] });
                return;
              }
            }

            const lines = ghostText.split('\n');
            resolve({
              items: [{
                insertText: ghostText,
                range: new monaco.Range(
                  position.lineNumber,
                  position.column,
                  position.lineNumber + Math.max(0, lines.length - 1),
                  lines.length === 1 ? position.column : (lines[lines.length - 1]?.length || 0) + 1,
                ),
                command: {
                  id: 'ai.ghost.accepted',
                  title: 'AI suggestion accepted',
                },
              }],
            } as unknown as languages.InlineCompletions);
          }, DEBOUNCE_MS);
        });
      },
      freeInlineCompletions: () => {},
      handleItemDidShow: () => {},
      groupId: 'ai-ghost',
    } as languages.InlineCompletionsProvider);

    const acceptCommand = monaco.editor.registerCommand('ai.ghost.accepted', () => {
      showStatusMessage(editorInst, 'AI 建议已应用');
    });

    providerRef.current = { dispose: () => provider.dispose() };

    return () => {
      provider.dispose();
      acceptCommand?.dispose();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
      if (pendingResolveRef.current) {
        pendingResolveRef.current({ items: [] });
        pendingResolveRef.current = null;
      }
      statusWidgetRef.current?.dispose();
    };
  }, [editorInst, monaco, language, enabled, getGhostText, estimateTokens, showStatusMessage]);

  return null;
}
