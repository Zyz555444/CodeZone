'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Code2, Users, Zap, CheckCircle, MessageSquare } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">
            关于 CodeZone
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            CodeZone 是新一代编程团队协作平台，致力于让软件开发更高效、更愉悦
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-16">
          <Card className="text-center p-6">
            <Code2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">实时协作</h3>
            <p className="text-muted-foreground">
              基于 CRDT 算法的零冲突实时协作编辑，让团队成员无缝配合
            </p>
          </Card>

          <Card className="text-center p-6">
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">团队管理</h3>
            <p className="text-muted-foreground">
              完整的项目管理、任务分配和进度跟踪体系
            </p>
          </Card>

          <Card className="text-center p-6">
            <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">高效开发</h3>
            <p className="text-muted-foreground">
              集成化开发环境，减少上下文切换，提升开发效率
            </p>
          </Card>
        </div>

        <div className="bg-card rounded-lg p-8 mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">核心优势</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-2">全栈 TypeScript</h4>
                <p className="text-muted-foreground">端到端的类型安全，减少运行时错误</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-2">现代化架构</h4>
                <p className="text-muted-foreground">Next.js 14 + Express + PostgreSQL</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-2">实时通信</h4>
                <p className="text-muted-foreground">WebSocket + Socket.IO 实现毫秒级同步</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-2">开源友好</h4>
                <p className="text-muted-foreground">MIT 许可，自由定制和扩展</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">开始使用</h2>
          <p className="text-muted-foreground mb-8">
            立即注册，体验全新的团队协作开发方式
          </p>
          <div className="flex gap-4 justify-center">
            <a href="/register">
              <Button size="lg" className="px-8">
                免费注册
              </Button>
            </a>
            <a href="/features">
              <Button size="lg" variant="outline" className="px-8">
                了解更多
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
