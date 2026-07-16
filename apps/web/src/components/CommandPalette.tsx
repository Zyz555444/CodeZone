import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, CornerDownLeft, X,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { searchCommands, type CommandItem } from "@/lib/commandIndex";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const groupOrder = ["导航", "仓库", "议题", "合并请求", "团队", "操作"];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CommandItem[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  const { team } = useAppStore();

  // 加载 / 搜索
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setActionError("");
    setActive(0);
    const t = setTimeout(() => {
      searchCommands(query, team?.id ?? null)
        .then((res) => {
          if (!cancelled) {
            setItems(res);
            setLoading(false);
          }
        })
        .catch(() => !cancelled && setLoading(false));
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open, team?.id]);

  // 聚焦输入框
  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ESC 关闭在 App 层处理,这里处理键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[active];
        if (item) executeItem(item);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [items, active],
  );

  const executeItem = useCallback(
    async (item: CommandItem) => {
      setActionError("");
      try {
        if (item.action === "toggle-theme") {
          toggleTheme();
        } else if (item.action === "new-issue") {
          // 跳到第一个仓库的「新建议题」流程;无仓库时回退到仓库列表
          const repos = await api.getRepos().catch(() => [] as { id: string }[]);
          if (repos.length > 0) {
            navigate(`/repos/${repos[0].id}?new=issue`);
          } else {
            navigate("/repos");
          }
        } else if (item.action === "new-pr") {
          navigate("/pulls?new=pr");
        } else if (item.href) {
          navigate(item.href);
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "操作失败");
        return;
      }
      onClose();
    },
    [navigate, onClose, toggleTheme],
  );

  // 滚动到激活项
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  // 分组
  const grouped = items.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.group] ||= []).push(item);
    return acc;
  }, {});
  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-neutral-10/30 dark:bg-black/50 backdrop-blur-thin animate-fade-in" />

      {/* 面板 */}
      <div
        className="relative w-full max-w-xl bg-paper rounded-xl ring-1 ring-border shadow-lg overflow-hidden animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* 输入 */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="w-icon-md h-icon-md text-neutral-5 dark:text-[var(--neutral-5)] shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索页面、仓库、成员,或输入命令…"
            className="flex-1 bg-transparent text-copy-15 text-neutral-9 dark:text-[var(--neutral-9)] placeholder:text-neutral-5 dark:placeholder:text-[var(--neutral-5)] outline-none"
            aria-label="搜索"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="command-results"
          />
          <kbd className="flex items-center gap-0.5 text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)] ring-1 ring-border rounded px-1.5 py-0.5">
            <X className="w-2.5 h-2.5" /> 关闭
          </kbd>
        </div>

        {/* 结果 */}
        <div ref={listRef} id="command-results" className="max-h-[52vh] overflow-y-auto py-2">
          {actionError && (
            <div className="mx-4 mb-2 px-3 py-1.5 rounded text-copy-13 text-error bg-error/10">
              {actionError}
            </div>
          )}
          {loading ? (
            <div className="px-4 py-8 text-center text-copy-13 text-neutral-5 dark:text-[var(--neutral-5)]">
              加载中…
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center text-copy-13 text-neutral-5 dark:text-[var(--neutral-5)]">
              未找到匹配项
            </div>
          ) : (
            groupOrder
              .filter((g) => grouped[g]?.length)
              .map((group) => (
                <div key={group} className="mb-1">
                  <p className="px-4 py-1.5 text-caption-10 uppercase tracking-eyebrow text-neutral-5 dark:text-[var(--neutral-5)]">
                    {group}
                  </p>
                  {grouped[group].map((item) => {
                    flatIdx += 1;
                    const idx = flatIdx;
                    const Icon = (LucideIcons as any)[item.icon] ?? LucideIcons.Circle;
                    const isActive = idx === active;
                    return (
                      <button
                        key={item.id}
                        data-idx={idx}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => executeItem(item)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-150",
                          isActive
                            ? "bg-[var(--color-accent-soft)]"
                            : "hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)]",
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-icon-md h-icon-md shrink-0",
                            isActive
                              ? "text-[var(--color-accent)]"
                              : "text-neutral-6 dark:text-[var(--neutral-6)]",
                          )}
                          strokeWidth={1.75}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-copy-14 truncate",
                              isActive
                                ? "text-[var(--color-accent)] font-medium"
                                : "text-neutral-9 dark:text-[var(--neutral-9)]",
                            )}
                          >
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        {isActive && (
                          <CornerDownLeft className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
          )}
        </div>

        {/* 底栏 — 只显示键盘提示,不再放无关文案 */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-border text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)]">
          <span className="flex items-center gap-1">
            <kbd className="ring-1 ring-border rounded px-1">↑↓</kbd> 导航
          </span>
          <span className="flex items-center gap-1">
            <kbd className="ring-1 ring-border rounded px-1">↵</kbd> 选择
          </span>
          <span className="flex items-center gap-1">
            <kbd className="ring-1 ring-border rounded px-1">esc</kbd> 关闭
          </span>
        </div>
      </div>
    </div>
  );
}

