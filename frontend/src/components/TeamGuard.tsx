'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

interface TeamGuardProps {
  children: React.ReactNode;
}

export function TeamGuard({ children }: TeamGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasTeam, setTeamStatus, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    // 刷新团队状态
    api.get('/auth/me').then(({ data }) => {
      setTeamStatus(data.hasTeam, data.teams || []);
      if (!data.hasTeam && pathname !== '/team-setup') {
        router.replace('/team-setup');
      }
    }).catch(() => {});
  }, [isAuthenticated, pathname, router, setTeamStatus]);

  if (!hasTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-1">
        <div className="animate-pulse text-neutral-7">检查团队状态...</div>
      </div>
    );
  }

  return <>{children}</>;
}
