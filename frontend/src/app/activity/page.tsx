'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Activity, FileEdit, MessageSquare, UserPlus, GitCommit, CheckCircle2, XCircle } from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';

const activities = [
  {
    id: 1,
    type: 'task_created',
    user: '张三',
    target: '任务 #123',
    description: '创建了新任务 "用户登录功能开发"',
    time: '5 分钟前',
    icon: CheckCircle2,
    iconBg: 'bg-success/20',
    iconColor: 'text-success',
  },
  {
    id: 2,
    type: 'file_updated',
    user: '李四',
    target: 'src/app/page.tsx',
    description: '更新了首页组件代码',
    time: '10 分钟前',
    icon: FileEdit,
    iconBg: 'bg-info/20',
    iconColor: 'text-info',
  },
  {
    id: 3,
    type: 'comment_added',
    user: '王五',
    target: '任务 #122',
    description: '在任务 "修复登录 bug" 下添加了评论',
    time: '1 小时前',
    icon: MessageSquare,
    iconBg: 'bg-warning/20',
    iconColor: 'text-warning',
  },
  {
    id: 4,
    type: 'member_joined',
    user: '赵六',
    target: '项目',
    description: '加入了 "CodeZone Frontend" 项目',
    time: '2 小时前',
    icon: UserPlus,
    iconBg: 'bg-accent-subtle',
    iconColor: 'text-accent',
  },
  {
    id: 5,
    type: 'code_commit',
    user: '孙七',
    target: 'main',
    description: '提交代码: "feat: 添加用户设置页面"',
    time: '3 小时前',
    icon: GitCommit,
    iconBg: 'bg-neutral-3',
    iconColor: 'text-neutral-7',
  },
];

const typeLabels: Record<string, string> = {
  task_created: '创建任务',
  file_updated: '更新文件',
  comment_added: '添加评论',
  member_joined: '加入项目',
  code_commit: '代码提交',
};

export default function ActivityPage() {
  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-1">
            <div className="container mx-auto max-w-4xl px-6 py-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="font-serif text-3xl font-medium text-neutral-10">
                    活动日志
                  </h1>
                  <p className="text-neutral-7 mt-1">
                    查看团队成员的所有活动记录
                  </p>
                </div>
                <Button variant="outline">
                  筛选
                </Button>
              </div>

              {/* Activity List */}
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <Card key={activity.id} className="hover:shadow-float transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg ${activity.iconBg} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-5 w-5 ${activity.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-neutral-10">{activity.user}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-3 text-neutral-7">
                                {typeLabels[activity.type]}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-8 mb-1">
                              {activity.description}
                            </p>
                            <p className="text-xs text-neutral-6">
                              {activity.time}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Load More */}
              <div className="text-center mt-8">
                <Button variant="outline">
                  加载更多
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
    </TeamGuard>
  );
}
