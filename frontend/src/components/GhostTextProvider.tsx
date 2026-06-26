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

export function GhostTextProvider({ editor: editorInst, monaco, language, enabled = true }: GhostTextProviderProps) {
  const providerRef = useRef<{ dispose: () => void } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

          timerRef.current = setTimeout(async () => {
            if (token.isCancellationRequested) {
              resolve({ items: [] as languages.InlineCompletion[] });
              return;
            }

            const ghostText = await getGhostText(prefixText, suffixText);
            if (!ghostText || token.isCancellationRequested) {
              resolve({ items: [] as languages.InlineCompletion[] });
              return;
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
              }],
            } as unknown as languages.InlineCompletions);
          }, DEBOUNCE_MS);
        });
      },
      freeInlineCompletions: () => {},
      handleItemDidShow: () => {},
      groupId: 'ai-ghost',
    } as languages.InlineCompletionsProvider);

    providerRef.current = { dispose: () => provider.dispose() };

    return () => {
      provider.dispose();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [editorInst, monaco, language, enabled, getGhostText, estimateTokens]);

  return null;
}
