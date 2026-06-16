'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  FileEdit,
  MessageSquare,
  UserPlus,
  GitCommit,
  Loader2,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';
import { api } from '@/lib/api';
import { getRelativeTime } from '@/lib/utils';

interface ActivityUser {
  id: string;
  username: string;
  avatar?: string;
}

interface ActivityItem {
  id: string;
  type: string;
  content: string;
  metadata: unknown;
  projectId: string;
  createdAt: string;
  user: ActivityUser | null;
}

const TYPE_CONFIG: Record<string, { icon: React.FC<{ className?: string }>; iconBg: string; iconColor: string; label: string }> = {
  task_created: { icon: CheckCircle2, iconBg: 'bg-success/20', iconColor: 'text-success', label: '创建任务' },
  task_updated: { icon: FileEdit, iconBg: 'bg-info/20', iconColor: 'text-info', label: '更新任务' },
  file_updated: { icon: FileEdit, iconBg: 'bg-info/20', iconColor: 'text-info', label: '更新文件' },
  comment_added: { icon: MessageSquare, iconBg: 'bg-warning/20', iconColor: 'text-warning', label: '添加评论' },
  member_joined: { icon: UserPlus, iconBg: 'bg-accent-subtle', iconColor: 'text-accent', label: '加入项目' },
  code_commit: { icon: GitCommit, iconBg: 'bg-neutral-3', iconColor: 'text-neutral-7', label: '代码提交' },
};

function groupByDate(activities: ActivityItem[]): Record<string, ActivityItem[]> {
  const groups: Record<string, ActivityItem[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const activity of activities) {
    const date = new Date(activity.createdAt);
    date.setHours(0, 0, 0, 0);

    let label: string;
    if (date.getTime() === today.getTime()) {
      label = '今天';
    } else if (date.getTime() === yesterday.getTime()) {
      label = '昨天';
    } else {
      label = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(activity);
  }
  return groups;
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/activities');
      setActivities(data.activities || []);
    } catch {
      setError('加载活动记录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const grouped = React.useMemo(() => groupByDate(activities), [activities]);

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-1">
            <div className="container mx-auto max-w-4xl px-6 py-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="font-serif text-3xl font-medium text-neutral-10">
                    活动日志
                  </h1>
                  <p className="text-neutral-7 mt-1">
                    查看团队成员的所有活动记录
                  </p>
                </div>
                <Button variant="outline" onClick={fetchActivities} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </div>

              {loading && !activities.length && (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-neutral-3 shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-neutral-3 rounded w-1/3" />
                            <div className="h-3 bg-neutral-3 rounded w-2/3" />
                            <div className="h-3 bg-neutral-3 rounded w-1/4" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {error && !loading && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-neutral-7 mb-4">{error}</p>
                    <Button variant="outline" onClick={fetchActivities}>
                      重试
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!loading && !error && !activities.length && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Inbox className="h-12 w-12 text-neutral-5 mx-auto mb-4" />
                    <p className="text-neutral-7 text-lg mb-1">暂无活动记录</p>
                    <p className="text-neutral-6 text-sm">当团队成员开始协作时，活动记录将在这里显示</p>
                  </CardContent>
                </Card>
              )}

              {!loading && !error && activities.length > 0 && Object.entries(grouped).map(([dateLabel, items]) => (
                <div key={dateLabel} className="mb-8">
                  <h2 className="text-sm font-medium text-neutral-6 mb-3 px-1">{dateLabel}</h2>
                  <div className="space-y-3">
                    {items.map((activity) => {
                      const config = TYPE_CONFIG[activity.type] || {
                        icon: FileEdit,
                        iconBg: 'bg-neutral-3',
                        iconColor: 'text-neutral-7',
                        label: activity.type,
                      };
                      const Icon = config.icon;
                      return (
                        <Card key={activity.id} className="hover:shadow-float transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 rounded-lg ${config.iconBg} flex items-center justify-center shrink-0`}>
                                <Icon className={`h-5 w-5 ${config.iconColor}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-neutral-10">
                                    {activity.user?.username || '未知用户'}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-3 text-neutral-7">
                                    {config.label}
                                  </span>
                                </div>
                                <p className="text-sm text-neutral-8 mb-1">
                                  {activity.content}
                                </p>
                                <p className="text-xs text-neutral-6">
                                  {getRelativeTime(activity.createdAt)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}

              {activities.length >= 50 && (
                <div className="text-center mt-8">
                  <p className="text-sm text-neutral-6">仅显示最近 50 条活动记录</p>
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
