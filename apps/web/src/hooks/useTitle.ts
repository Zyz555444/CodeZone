import { useEffect } from "react";

const APP_NAME = "CodeZone";

/**
 * 设置当前页面 document.title。
 * 卸载时恢复默认,避免 SPA 路由切换后标题被旧值卡住。
 * 多个 useTitle 嵌套调用按"最后一个 mount"生效,卸载时回退。
 */
export function useTitle(title?: string): void {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${APP_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
