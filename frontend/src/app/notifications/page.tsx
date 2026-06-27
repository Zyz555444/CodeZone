'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Bell, Check, Users, GitBranch, AlertCircle } from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  content?: string;
  isRead: boolean;
  createdAt: string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  TASK: Check,
  REVIEW: GitBranch,
  MEMBER: Users,
  SYSTEM: AlertCircle,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    await Promise.all(unread.map(n => markAsRead(n.id)));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <TeamGuard>
        <div className="flex h-screen overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 flex items-center justify-center bg-neutral-1">
                <div className="animate-pulse text-neutral-7">加载中...</div>
              </main>
            </div>
          </div>
        </div>
      </TeamGuard>
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
            <div className="container mx-auto max-w-3xl px-6 py-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-2 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-neutral-7" />
                  </div>
                  <div>
                    <h1 className="font-serif text-title-24 font-medium text-neutral-10">
                      通知中心
                    </h1>
                    <p className="text-copy-13 text-neutral-7">
                      {unreadCount > 0 ? `${unreadCount} 条未读通知` : '暂无未读通知'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={markAllAsRead}>
                    <Check className="h-3 w-3" />
                    全部已读
                  </Button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const Icon = iconMap[notification.type] || Bell;
                  return (
                    <Card 
                      key={notification.id} 
                      className={cn(
                        "transition-all hover:shadow-whisper cursor-pointer",
                        !notification.isRead && "border-l-4 border-l-accent"
                      )}
                      onClick={() => !notification.isRead && markAsRead(notification.id)}
                    >
                      <CardContent className="p-4 flex gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          notification.type === 'TASK' && "bg-success/10 text-success",
                          notification.type === 'REVIEW' && "bg-info/10 text-info",
                          notification.type === 'MEMBER' && "bg-accent-subtle text-accent",
                          notification.type === 'SYSTEM' && "bg-neutral-3 text-neutral-6"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={cn(
                                "font-medium",
                                notification.isRead ? "text-neutral-8" : "text-neutral-10"
                              )}>
                                {notification.title}
                              </p>
                              <p className="text-copy-13 text-neutral-7 mt-0.5">
                                {notification.content}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
                            )}
                          </div>
                          <p className="text-label-12 text-neutral-6 mt-2">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {notifications.length === 0 && (
                <div className="text-center py-16">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-neutral-7" />
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
