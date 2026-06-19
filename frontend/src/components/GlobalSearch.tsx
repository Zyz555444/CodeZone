'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FolderKanban, CheckSquare, FileText, User, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';

interface SearchResultItem {
  id: string;
  name?: string;
  title?: string;
  username?: string;
  avatar?: string;
  link: string;
  type: string;
}

interface SearchResults {
  projects: SearchResultItem[];
  tasks: SearchResultItem[];
  users: SearchResultItem[];
  files: SearchResultItem[];
}

const GROUP_LABELS: Record<string, string> = {
  projects: '项目',
  tasks: '任务',
  files: '文件',
  users: '成员',
};

const GROUP_ICONS: Record<string, React.FC<{ className?: string }>> = {
  projects: FolderKanban,
  tasks: CheckSquare,
  files: FileText,
  users: User,
};

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  const flatResults = useMemo(() => {
    if (!results) return [];
    const items: { group: string; item: SearchResultItem }[] = [];
    for (const group of ['projects', 'tasks', 'files', 'users']) {
      const groupResults = results[group as keyof SearchResults];
      if (groupResults && groupResults.length > 0) {
        for (const item of groupResults) {
          items.push({ group, item });
        }
      }
    }
    return items;
  }, [results]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults(null);
      setActiveIndex(-1);
      setHasSearched(false);
    }
  }, [isOpen]);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const { data } = await api.get('/search', { params: { q } });
      setResults(data);
      setActiveIndex(-1);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const result = flatResults[activeIndex];
      if (result) {
        router.push(result.item.link);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (link: string) => {
    router.push(link);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-7 bg-neutral-2 hover:bg-neutral-3 rounded-lg border border-neutral-4 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">搜索...</span>
        <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-xs bg-neutral-1 rounded border border-neutral-4 text-neutral-6">
          CmdK
        </kbd>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center pt-[20vh]"
          onClick={() => setIsOpen(false)}
        >
          <Card
            className="w-full max-w-lg mx-4 p-0 shadow-float rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-4">
              <Search className="h-5 w-5 text-neutral-6 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索项目、任务、文件、成员..."
                className="flex-1 bg-transparent text-neutral-10 placeholder:text-neutral-6 outline-none text-sm"
              />
              <kbd className="text-xs text-neutral-6 bg-neutral-3 px-2 py-0.5 rounded">ESC</kbd>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-neutral-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  搜索中...
                </div>
              )}
              {!loading && hasSearched && query && !results && (
                <div className="px-4 py-6 text-sm text-neutral-6 text-center">
                  未找到结果
                </div>
              )}
              {!loading && !query && !hasSearched && (
                <div className="px-4 py-6 text-sm text-neutral-6 text-center">
                  输入关键词开始搜索
                </div>
              )}
              {results && (Object.entries(results) as [string, SearchResultItem[]][]).map(([group, items]) => {
                if (!items || items.length === 0) return null;
                const GroupIcon = GROUP_ICONS[group];
                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-neutral-6 uppercase bg-neutral-1">
                      <GroupIcon className="h-3.5 w-3.5" />
                      {GROUP_LABELS[group]}
                    </div>
                    {items.map((item) => {
                      const globalIdx = flatResults.findIndex(
                        r => r.group === group && r.item.id === item.id
                      );
                      const isActive = globalIdx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item.link)}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-3 transition-colors flex items-center gap-3 ${
                            isActive ? 'bg-neutral-3' : ''
                          }`}
                        >
                          <span className="text-neutral-9 truncate flex-1">
                            {item.name || item.title || item.username}
                          </span>
                          <span className="text-xs text-neutral-6 shrink-0">{item.type}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
