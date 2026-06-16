'use client';

import { useEffect } from 'react';

interface ShortcutConfig {
  key: string;
  handler: () => void;
  description: string;
  modifier?: 'ctrl' | 'meta' | 'shift' | 'alt';
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (!keyMatch) continue;

        const modifiersMatch =
          (!shortcut.modifier && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) ||
          (shortcut.modifier === 'ctrl' && e.ctrlKey) ||
          (shortcut.modifier === 'meta' && e.metaKey) ||
          (shortcut.modifier === 'shift' && e.shiftKey) ||
          (shortcut.modifier === 'alt' && e.altKey);

        if (modifiersMatch) {
          if (isInputFocused && ['Escape'].includes(shortcut.key)) {
            e.preventDefault();
            shortcut.handler();
            return;
          }
          if (!isInputFocused || shortcut.modifier) {
            e.preventDefault();
            shortcut.handler();
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export const GLOBAL_SHORTCUTS: Record<string, { key: string; description: string; modifier?: string }> = {
  DASHBOARD: { key: 'h', description: '前往仪表盘', modifier: 'meta' },
  PROJECTS: { key: 'p', description: '前往项目列表', modifier: 'meta' },
  TASKS: { key: 't', description: '前往任务看板', modifier: 'meta' },
  CODE: { key: 'e', description: '打开代码编辑器', modifier: 'meta' },
  SEARCH: { key: 'k', description: '全局搜索', modifier: 'meta' },
  ACTIVITY: { key: 'a', description: '查看活动', modifier: 'meta' },
};
