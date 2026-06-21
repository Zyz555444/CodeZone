'use client';

import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarChart3, Code2, GitPullRequest, MessageSquare, Users, Zap } from 'lucide-react';

const features = [
  {
    icon: Code2,
    title: '实时协作编辑',
    description: '多人同时编辑代码，基于 Yjs 的 CRDT 算法实现零冲突同步',
  },
  {
    icon: GitPullRequest,
    title: '代码审查',
    description: '行级评论、审查流程管理、代码质量保证',
  },
  {
    icon: MessageSquare,
    title: '团队沟通',
    description: '即时通讯、项目讨论区、实时状态同步',
  },
  {
    icon: Zap,
    title: 'CI/CD 流水线',
    description: '自动化构建、测试、部署，支持自定义工作流',
  },
  {
    icon: Users,
    title: '项目管理',
    description: '敏捷看板、任务分配、进度跟踪、时间估算',
  },
  {
    icon: BarChart3,
    title: '数据分析',
    description: '代码质量分析、团队效率统计、项目健康度评估',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-neutral-1">
      <div className="container mx-auto max-w-5xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="font-serif text-5xl font-medium text-neutral-10 mb-4">
            功能特性
          </h1>
          <p className="text-xl text-neutral-7 max-w-2xl mx-auto">
            CodeZone 提供完整的团队协作开发解决方案
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="hover:shadow-float transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-accent-subtle flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
