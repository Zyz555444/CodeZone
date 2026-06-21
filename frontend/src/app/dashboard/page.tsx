'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { TeamGuard } from '@/components/TeamGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FolderGit2, CheckSquare, Users, Activity, Plus, ArrowRight, GitBranch, Clock, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  myTasks: number;
  teamMembers: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
}

interface ActivityItem {
  id: string;
  type: string;
  content: string;
  metadata: any;
  projectId: string;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null } | null;
}

const statusLabels: Record<string, string> = {
  TODO: '待处理',
  IN_PROGRESS: '进行中',
  IN_REVIEW: '审查中',
  DONE: '已完成',
  BLOCKED: '已阻塞',
};

const statusColors: Record<string, string> = {
  TODO: 'bg-neutral-3',
  IN_PROGRESS: 'bg-info',
  IN_REVIEW: 'bg-warning',
  DONE: 'bg-success',
  BLOCKED: 'bg-error',
};

const priorityLabels: Record<string, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '紧急',
};

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data.stats);
        setActivities(res.data.recentActivities || []);
      } catch (error) {
        console.error('获取仪表盘数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const totalStatusTasks = stats
    ? Object.values(stats.tasksByStatus).reduce((sum, v) => sum + v, 0)
    : 0;

  const maxPriorityCount = stats
    ? Math.max(...Object.values(stats.tasksByPriority), 1)
    : 1;

  const statCards = [
    { name: '项目', value: stats?.totalProjects ?? 0, icon: FolderGit2, href: '/projects' },
    { name: '任务', value: stats?.totalTasks ?? 0, icon: CheckSquare, href: '/tasks' },
    { name: '团队成员', value: stats?.teamMembers ?? 0, icon: Users, href: '/team' },
    { name: '我的任务', value: stats?.myTasks ?? 0, icon: Clock, href: '/tasks' },
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

                {loading ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 rounded-xl bg-neutral-2 animate-pulse" />
                      ))}
                    </div>
                    <div className="grid lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 h-64 rounded-xl bg-neutral-2 animate-pulse" />
                      <div className="h-64 rounded-xl bg-neutral-2 animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {statCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                          <Link key={stat.name} href={stat.href}>
                            <Card className="hover:border-accent/30 transition-colors cursor-pointer group h-full">
                              <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center group-hover:bg-accent-subtle transition-colors shrink-0">
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

                    {/* Main Content Grid */}
                    <div className="grid lg:grid-cols-3 gap-6 mb-6">
                      {/* Task Status Distribution */}
                      <Card className="lg:col-span-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="font-serif text-lg">任务分布</CardTitle>
                          <CardDescription className="text-neutral-7">按状态与优先级查看任务进展</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* Status bars */}
                          <div className="space-y-3 mb-6">
                            {Object.entries(statusLabels).map(([status, label]) => {
                              const count = stats?.tasksByStatus[status] || 0;
                              const width = totalStatusTasks > 0 ? (count / totalStatusTasks) * 100 : 0;
                              return (
                                <div key={status} className="flex items-center gap-3">
                                  <span className="text-sm text-neutral-7 w-14 shrink-0">{label}</span>
                                  <div className="flex-1 h-6 bg-neutral-2 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${statusColors[status]}`}
                                      style={{ width: `${width}%`, minWidth: count > 0 ? '24px' : '0' }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-neutral-9 w-6 text-right shrink-0">{count}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Priority bars */}
                          <div className="pt-4 border-t border-neutral-3">
                            <p className="text-sm text-neutral-7 mb-3">优先级分布</p>
                            <div className="space-y-2">
                              {Object.entries(priorityLabels).map(([priority, label]) => {
                                const count = stats?.tasksByPriority[priority] || 0;
                                const width = maxPriorityCount > 0 ? (count / maxPriorityCount) * 100 : 0;
                                return (
                                  <div key={priority} className="flex items-center gap-3">
                                    <span className="text-sm text-neutral-7 w-10 shrink-0">{label}</span>
                                    <div className="flex-1 h-5 bg-neutral-2 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${priority === 'URGENT' ? 'bg-error' : priority === 'HIGH' ? 'bg-warning' : priority === 'MEDIUM' ? 'bg-info' : 'bg-neutral-5'}`}
                                        style={{ width: `${width}%`, minWidth: count > 0 ? '20px' : '0' }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium text-neutral-9 w-6 text-right shrink-0">{count}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Quick Actions & Info */}
                      <div className="space-y-6">
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
                                <GitBranch className="h-4 w-4" />
                                编写代码
                              </Button>
                            </Link>
                            <Link href="/reviews/new" className="block">
                              <Button variant="secondary" className="w-full justify-start gap-3 h-11">
                                <Activity className="h-4 w-4" />
                                创建审查
                              </Button>
                            </Link>
                            <Link href="/projects/new" className="block">
                              <Button variant="secondary" className="w-full justify-start gap-3 h-11">
                                <FolderGit2 className="h-4 w-4" />
                                新建项目
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="font-serif text-lg">需要帮助？</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-neutral-7">
                              查看项目文档了解如何使用 CodeZone 的各项功能。
                            </p>
                            <Link href="/about">
                              <Button variant="outline" className="w-full">
                                查看文档
                                <ArrowRight className="h-3 w-3 ml-2" />
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                          <CardTitle className="font-serif text-lg">近期活动</CardTitle>
                          <CardDescription className="text-neutral-7">您参与项目的最新动态</CardDescription>
                        </div>
                        <Link href="/activity">
                          <Button variant="ghost" size="sm" className="gap-1 text-neutral-7">
                            查看全部
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </CardHeader>
                      <CardContent>
                        {activities.length > 0 ? (
                          <div className="divide-y divide-neutral-3">
                            {activities.map((activity) => (
                              <div key={activity.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                                <div className="w-7 h-7 rounded-full bg-neutral-2 flex items-center justify-center shrink-0">
                                  {activity.user?.avatar ? (
                                    <img
                                      src={activity.user.avatar}
                                      alt=""
                                      className="w-7 h-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    <Activity className="h-3.5 w-3.5 text-neutral-6" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-neutral-9">
                                    <span className="font-medium">{activity.user?.username || '未知用户'}</span>
                                    {' '}{activity.content}
                                  </p>
                                  <p className="text-xs text-neutral-7 mt-0.5">
                                    {new Date(activity.createdAt).toLocaleString('zh-CN', {
                                      month: 'numeric',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-neutral-7">
                            <Calendar className="h-10 w-10 mx-auto mb-3 text-neutral-5" />
                            <p className="text-sm">暂无活动记录</p>
                            <p className="text-xs text-neutral-6 mt-1">创建项目或任务后，活动记录将显示在这里</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </TeamGuard>
  );
}
