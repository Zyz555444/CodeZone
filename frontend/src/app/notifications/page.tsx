'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Bell, Check, Trash2, MessageSquare, Users, GitBranch, AlertCircle } from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';
import { cn } from '@/lib/utils';

const notifications = [
  {
    id: '1',
    type: 'task',
    title: '新任务分配',
    content: '您被分配到任务 "完成用户认证模块"',
    time: '5 分钟前',
    read: false,
  },
  {
    id: '2',
    type: 'review',
    title: '代码审查请求',
    content: '张三 请求您审查 Pull Request #123',
    time: '1 小时前',
    read: false,
  },
  {
    id: '3',
    type: 'member',
    title: '新成员加入',
    content: '李四 加入了项目 "电商平台"',
    time: '2 小时前',
    read: true,
  },
  {
    id: '4',
    type: 'system',
    title: '系统更新',
    content: 'CodeZone 已更新到 v1.0.1 版本',
    time: '1 天前',
    read: true,
  },
];

const iconMap = {
  task: Check,
  review: GitBranch,
  member: Users,
  system: AlertCircle,
};

export default function NotificationsPage() {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-1">
            <div className="container mx-auto max-w-3xl px-6 py-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-2 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-neutral-7" />
                  </div>
                  <div>
                    <h1 className="font-serif text-2xl font-medium text-neutral-10">
                      通知中心
                    </h1>
                    <p className="text-sm text-neutral-7">
                      {unreadCount > 0 ? `${unreadCount} 条未读通知` : '暂无未读通知'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Check className="h-3 w-3" />
                    全部已读
                  </Button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const Icon = iconMap[notification.type as keyof typeof iconMap];
                  return (
                    <Card 
                      key={notification.id} 
                      className={cn(
                        "transition-all hover:shadow-whisper cursor-pointer",
                        !notification.read && "border-l-4 border-l-accent"
                      )}
                    >
                      <CardContent className="p-4 flex gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          notification.type === 'task' && "bg-success/10 text-success",
                          notification.type === 'review' && "bg-info/10 text-info",
                          notification.type === 'member' && "bg-accent-subtle text-accent",
                          notification.type === 'system' && "bg-neutral-3 text-neutral-6"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={cn(
                                "font-medium",
                                notification.read ? "text-neutral-8" : "text-neutral-10"
                              )}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-neutral-7 mt-0.5">
                                {notification.content}
                              </p>
                            </div>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
                            )}
                          </div>
                          <p className="text-xs text-neutral-6 mt-2">
                            {notification.time}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {notifications.length === 0 && (
                <div className="text-center py-16">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-neutral-5" />
                  <p className="text-neutral-7">暂无通知</p>
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
