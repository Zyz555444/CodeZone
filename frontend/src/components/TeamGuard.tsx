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
  const { hasTeam, setTeamStatus, isAuthenticated } = useAuthStore();
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }

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
  }, [isAuthenticated, pathname, router, setTeamStatus]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-1">
        <div className="text-center">
          <p className="text-neutral-8 mb-4">无法连接到服务器，请检查网络后重试</p>
          <button
            onClick={() => { setError(false); setChecking(true); }}
            className="px-4 py-2 bg-primary-6 text-white rounded-lg hover:bg-primary-7 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (checking || !hasTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-1">
        <div className="animate-pulse text-neutral-7">检查团队状态...</div>
      </div>
    );
  }

  return <>{children}</>;
}
