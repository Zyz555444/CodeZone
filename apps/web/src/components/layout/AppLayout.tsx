import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useAppStore } from "@/store/useAppStore";
import { tokenStore } from "@/lib/api";

interface AppLayoutProps {
  title?: string;
  subtitle?: string;
}

export function AppLayout({ title, subtitle }: AppLayoutProps) {
  const { initialized, currentUser, initUser } = useAppStore();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!initialized) initUser();
  }, [initialized, initUser]);

  // 未登录则跳转登录页
  useEffect(() => {
    if (initialized && !currentUser) {
      navigate("/login", { replace: true });
    }
  }, [initialized, currentUser, navigate]);

  // 初始化中或未登录 — 显示骨架
  if (!initialized || !currentUser) {
    if (!tokenStore.get()) {
      // 无 token 直接由上面的 effect 跳转
      return null;
    }
    return (
      <div className="min-h-screen grid place-items-center bg-paper text-neutral-5 dark:text-[var(--neutral-5)]">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-md bg-[var(--color-accent)] animate-pulse" />
          <span className="text-copy-14">加载中…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper text-neutral-9 dark:text-[var(--neutral-9)]">
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={title}
          subtitle={subtitle}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
