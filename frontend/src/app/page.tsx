'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const { state } = JSON.parse(authData);
          if (state?.isAuthenticated) {
            router.replace('/dashboard');
            return;
          }
        } catch (e) {}
      }
      router.replace('/login');
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-1">
      <div className="animate-pulse text-neutral-7">加载中...</div>
    </div>
  );
}
