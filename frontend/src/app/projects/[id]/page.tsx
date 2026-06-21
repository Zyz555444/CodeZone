'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  ArrowLeft, 
  Users, 
  CheckSquare, 
  FolderGit2,
  MessageSquare,
  Calendar,
  FileCode,
  Settings,
  GitBranch
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { TeamGuard } from '@/components/TeamGuard';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    fetchProject();
  }, [token, params.id]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${params.id}`);
      setProject(response.data.project);
    } catch (error) {
      console.error('获取项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-1">
        <div className="text-neutral-7">加载中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-1">
        <div className="text-neutral-7">项目不存在</div>
      </div>
    );
  }

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-1">
            <div className="container py-8 px-6">
              {/* Back Button */}
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-neutral-7 hover:text-neutral-9 mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">返回</span>
              </button>

              {/* Project Header */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-accent-subtle flex items-center justify-center">
                    <FolderGit2 className="h-7 w-7 text-accent" />
                  </div>
                  <div>
                    <h1 className="font-serif text-3xl font-medium text-neutral-10">
                      {project.name}
                    </h1>
                    <p className="text-neutral-7">
                      {project.description || '暂无描述'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => router.push(`/code?projectId=${project.id}`)}>
                    <FileCode className="mr-2 h-4 w-4" />
                    打开代码编辑器
                  </Button>
                  <Button variant="secondary" onClick={() => router.push(`/tasks?projectId=${project.id}`)}>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    任务
                  </Button>
                  <Button variant="secondary" onClick={() => router.push(`/chat?projectId=${project.id}`)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    讨论
                  </Button>
                  <Button variant="secondary" onClick={() => router.push(`/projects/${project.id}/repos`)}>
                    <GitBranch className="mr-2 h-4 w-4" />
                    仓库
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center">
                      <FolderGit2 className="h-6 w-6 text-neutral-6" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-7">项目 ID</p>
                      <p className="font-mono text-neutral-10">{project.id?.slice(0, 8)}...</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center">
                      <Users className="h-6 w-6 text-neutral-6" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-7">可见性</p>
                      <p className="font-medium text-neutral-10">
                        {project.visibility === 'PUBLIC' ? '公开' : '私有'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-neutral-6" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-7">创建时间</p>
                      <p className="font-medium text-neutral-10">{formatDate(project.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Details Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-serif">统计信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-neutral-4">
                      <span className="text-neutral-7">成员数</span>
                      <span className="font-medium text-neutral-10">{project._count?.members || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-neutral-4">
                      <span className="text-neutral-7">任务数</span>
                      <span className="font-medium text-neutral-10">{project._count?.tasks || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-neutral-7">文件数</span>
                      <span className="font-medium text-neutral-10">{project._count?.files || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Members */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-serif">团队成员</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {project.members && project.members.length > 0 ? (
                      <div className="space-y-3">
                        {project.members.map((member: any) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between py-2 border-b border-neutral-4 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-neutral-2 flex items-center justify-center">
                                <span className="text-sm font-medium text-neutral-7">
                                  {member.user.username[0].toUpperCase()}
                                </span>
                              </div>
                              <span className="text-neutral-10">{member.user.username}</span>
                            </div>
                            <span className="text-xs px-3 py-1 rounded-full bg-neutral-3 text-neutral-7">
                              {member.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-7 text-sm py-4 text-center">暂无成员</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
    </TeamGuard>
  );
}
