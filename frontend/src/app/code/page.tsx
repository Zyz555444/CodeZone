'use client';

import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { TeamGuard } from '@/components/TeamGuard';
import { useProjectStore } from '@/stores/projectStore';
import { api } from '@/lib/api';

const CollaborativeWorkspace = dynamic(
  () => import('@/components/CollaborativeWorkspace').then(mod => ({ default: mod.CollaborativeWorkspace })),
  { ssr: false }
);

function CodePageContent() {
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');
  const { currentProject, setCurrentProject } = useProjectStore();
  const [loading, setLoading] = useState(!!projectIdFromUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectIdFromUrl) return;

    if (currentProject?.id === projectIdFromUrl) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    api.get(`/projects/${projectIdFromUrl}`)
      .then((res) => {
        setCurrentProject(res.data.project);
      })
      .catch((err) => {
        console.error('获取项目失败:', err);
        setError('项目加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [projectIdFromUrl]);

  const projectId = currentProject?.id;

  return (
    <TeamGuard>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden bg-neutral-1">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-neutral-7">加载项目中...</div>
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-copy-14 font-medium text-error mb-1">{error}</p>
                    <p className="text-copy-13 text-neutral-6">请返回项目列表重试</p>
                  </div>
                </div>
              ) : projectId ? (
                <CollaborativeWorkspace projectId={projectId} />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-copy-14 font-medium text-neutral-7 mb-1">请先选择一个项目</p>
                    <p className="text-copy-13 text-neutral-6">从项目列表中选择一个项目开始编码</p>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </TeamGuard>
  );
}

export default function CodePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-neutral-1"><div className="text-neutral-7">加载中...</div></div>}>
      <CodePageContent />
    </Suspense>
  );
}
