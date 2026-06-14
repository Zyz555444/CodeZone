'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, FolderGit2, Users, Calendar, Globe, Lock, MoreHorizontal } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { TeamGuard } from '@/components/TeamGuard';

interface Project {
  id: string;
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt?: string;
  _count?: {
    members?: number;
  };
}

export default function ProjectsPage() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const { projects, setProjects } = useProjectStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchProjects();
  }, [isAuthenticated, router, token]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects);
    } catch (error) {
      console.error('获取项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-1">
            <div className="container mx-auto max-w-6xl px-6 py-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="font-serif text-3xl font-medium text-neutral-10">
                    项目
                  </h1>
                  <p className="text-neutral-7 mt-1">
                    管理和协作您的所有项目
                  </p>
                </div>
                <Link href="/projects/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    新建项目
                  </Button>
                </Link>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-neutral-7">加载中...</div>
                </div>
              ) : projects.length === 0 ? (
                <Card className="max-w-md mx-auto">
                  <CardContent className="py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-2 flex items-center justify-center mx-auto mb-4">
                      <FolderGit2 className="h-8 w-8 text-neutral-5" />
                    </div>
                    <h3 className="font-serif text-lg font-medium text-neutral-10 mb-2">
                      暂无项目
                    </h3>
                    <p className="text-neutral-7 mb-6">
                      创建您的第一个项目开始协作
                    </p>
                    <Link href="/projects/new">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        新建项目
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <Card 
                      key={project.id}
                      className="group hover:shadow-float hover:border-accent/30 transition-all duration-300 cursor-pointer"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center group-hover:bg-accent-subtle transition-colors">
                            <FolderGit2 className="h-6 w-6 text-neutral-6 group-hover:text-accent transition-colors" />
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>

                        <h3 className="font-medium text-neutral-10 mb-1 group-hover:text-accent transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-neutral-7 line-clamp-2 mb-4">
                          {project.description || '暂无描述'}
                        </p>

                        <div className="flex items-center justify-between text-xs text-neutral-6">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {project._count?.members || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(project.createdAt || new Date().toISOString())}
                            </span>
                          </div>
                          {project.visibility === 'PUBLIC' ? (
                            <Globe className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* New Project Card */}
                  <Link href="/projects/new">
                    <Card className="border-dashed hover:border-accent/50 hover:bg-neutral-2 transition-all cursor-pointer h-full min-h-[180px]">
                      <CardContent className="h-full flex flex-col items-center justify-center py-8">
                        <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center mb-3">
                          <Plus className="h-6 w-6 text-neutral-5" />
                        </div>
                        <p className="text-neutral-7 font-medium">创建新项目</p>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      </div>
    </TeamGuard>
  );
}
