'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

interface TeamGuardProps {
  children: React.ReactNode;
}

export function TeamGuard({ children }: TeamGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hasTeam = useAuthStore((s) => s.hasTeam);
  const setTeamStatus = useAuthStore((s) => s.setTeamStatus);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }

    // Zustand 中已有团队信息：直接放行，后台静默验证
    if (hasTeam) {
      setChecking(false);
      api.get('/auth/me').then(({ data }) => {
        setTeamStatus(data.hasTeam, data.teams || []);
        if (!data.hasTeam && pathname !== '/team-setup') {
          router.replace('/team-setup');
        }
      }).catch(() => {});
      return;
    }

    // 无团队信息，阻塞等待 API 验证
    let cancelled = false;
    setError(false);
    setChecking(true);

    api.get('/auth/me').then(({ data }) => {
      if (cancelled) return;
      setTeamStatus(data.hasTeam, data.teams || []);
      if (!data.hasTeam && pathname !== '/team-setup') {
        router.replace('/team-setup');
      }
      setChecking(false);
    }).catch(() => {
      if (cancelled) return;
      setError(true);
      setChecking(false);
    });

    return () => { cancelled = true; };
  }, [isAuthenticated, pathname, router, setTeamStatus, retryCount, hasTeam]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-1">
        <div className="text-center">
          <p className="text-neutral-8 mb-4">无法连接到服务器，请检查网络后重试</p>
          <button
            onClick={() => { setError(false); setRetryCount(c => c + 1); }}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-1">
        <div className="animate-pulse text-neutral-7">检查团队状态...</div>
      </div>
    );
  }

  return <>{children}</>;
}
