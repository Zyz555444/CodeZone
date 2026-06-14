'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { TeamGuard } from '@/components/TeamGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FolderGit2, CheckSquare, Users, Activity, Plus, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [statsData, setStatsData] = useState({
    projects: 0,
    tasks: 0,
    members: 0,
    activities: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const [projectsRes, teamsRes] = await Promise.all([
          api.get('/projects'),
          api.get('/teams'),
        ]);
        const projects = projectsRes.data.projects || [];
        const teams = teamsRes.data.teams || [];
        const activeMembers = teams.reduce((sum: number, t: any) => sum + (t._count?.members || 0), 0);

        const projectIds = projects.map((p: any) => p.id);
        let totalTasks = 0;
        if (projectIds.length > 0) {
          const tasksRes = await api.get('/tasks');
          totalTasks = (tasksRes.data.tasks || []).length;
        }

        setStatsData({
          projects: projects.length,
          tasks: totalTasks,
          members: activeMembers,
          activities: 0,
        });
        setRecentProjects(projects.slice(0, 5));
      } catch (error) {
        console.error('获取仪表盘数据失败:', error);
      }
    };

    fetchStats();
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const stats = [
    { name: '项目', value: statsData.projects.toString(), icon: FolderGit2, href: '/projects' },
    { name: '任务', value: statsData.tasks.toString(), icon: CheckSquare, href: '/tasks' },
    { name: '团队成员', value: statsData.members.toString(), icon: Users, href: '/team' },
    { name: '本周活动', value: statsData.activities.toString(), icon: Activity, href: '/activity' },
  ];

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
                    欢迎回来
                  </h1>
                  <p className="text-neutral-7 mt-1">
                    今天是美好的一天，适合写代码
                  </p>
                </div>
                <Link href="/projects/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    新建项目
                  </Button>
                </Link>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Link key={stat.name} href={stat.href}>
                      <Card className="hover:border-accent/30 transition-colors cursor-pointer group">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center group-hover:bg-accent-subtle transition-colors">
                            <Icon className="h-6 w-6 text-neutral-6 group-hover:text-accent transition-colors" />
                          </div>
                          <div>
                            <p className="text-2xl font-medium text-neutral-10">{stat.value}</p>
                            <p className="text-sm text-neutral-7">{stat.name}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>

              {/* Content Grid */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Projects */}
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="font-serif text-lg">最近项目</CardTitle>
                      <CardDescription className="text-neutral-7">您最近访问或创建的项目</CardDescription>
                    </div>
                    <Link href="/projects">
                      <Button variant="ghost" size="sm" className="gap-1 text-neutral-7">
                        查看全部
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {recentProjects.length > 0 ? (
                      <div className="space-y-2">
                        {recentProjects.map((project: any) => (
                          <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-2 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-neutral-2 flex items-center justify-center">
                              <FolderGit2 className="h-4 w-4 text-neutral-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-10 truncate">{project.name}</p>
                              <p className="text-xs text-neutral-7">
                                {project._count?.tasks || 0} 个任务 · {project._count?.members || 0} 个成员
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-neutral-7">
                        <FolderGit2 className="h-12 w-12 mx-auto mb-4 text-neutral-5" />
                        <p className="mb-4">暂无项目</p>
                        <Link href="/projects/new">
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            创建第一个项目
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif text-lg">快捷操作</CardTitle>
                    <CardDescription className="text-neutral-7">常用功能快速入口</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Link href="/tasks/new" className="block">
                      <Button variant="secondary" className="w-full justify-start gap-3 h-11">
                        <CheckSquare className="h-4 w-4" />
                        创建任务
                      </Button>
                    </Link>
                    <Link href="/code" className="block">
                      <Button variant="secondary" className="w-full justify-start gap-3 h-11">
                        <FolderGit2 className="h-4 w-4" />
                        编写代码
                      </Button>
                    </Link>
                    <Link href="/reviews/new" className="block">
                      <Button variant="secondary" className="w-full justify-start gap-3 h-11">
                        <Activity className="h-4 w-4" />
                        创建审查
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">近期活动</CardTitle>
                  <CardDescription className="text-neutral-7">您的最近操作记录</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-neutral-7">
                    <Activity className="h-10 w-10 mx-auto mb-3 text-neutral-5" />
                    <p>暂无活动记录</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
      </div>
    </TeamGuard>
  );
}
