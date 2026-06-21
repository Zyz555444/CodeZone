'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { TeamGuard } from '@/components/TeamGuard';
import { useProjectStore } from '@/stores/projectStore';

// 禁用 SSR 以避免 Monaco Editor 在服务端渲染时引用 window 导致的错误
const CollaborativeWorkspace = dynamic(
  () => import('@/components/CollaborativeWorkspace').then(mod => ({ default: mod.CollaborativeWorkspace })),
  { ssr: false }
);

export default function CodePage() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const projectId = currentProject?.id;

  return (
    <TeamGuard>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden bg-neutral-1">
              {projectId ? (
                <CollaborativeWorkspace projectId={projectId} />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-base font-medium text-neutral-7 mb-1">请先选择一个项目</p>
                    <p className="text-sm text-neutral-6">从项目列表中选择一个项目开始编码</p>
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
