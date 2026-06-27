'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Code2, Users, Zap, CheckCircle } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-neutral-1">
      <div className="container mx-auto max-w-5xl px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="font-serif text-display-48 font-medium text-neutral-10 mb-6">
            CodeZone
          </h1>
          <p className="text-title-20 text-neutral-7 max-w-3xl mx-auto">
            新一代编程团队协作平台，致力于让软件开发更高效、更愉悦
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 mb-16">
          <Card className="text-center">
            <CardContent>
              <Code2 className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-serif text-title-20 font-medium text-neutral-10 mb-2">实时协作</h3>
              <p className="text-neutral-7">
                基于 CRDT 算法的零冲突实时协作编辑，让团队成员无缝配合
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent>
              <Users className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-serif text-title-20 font-medium text-neutral-10 mb-2">团队管理</h3>
              <p className="text-neutral-7">
                完整的项目管理、任务分配和进度跟踪体系
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent>
              <Zap className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-serif text-title-20 font-medium text-neutral-10 mb-2">高效开发</h3>
              <p className="text-neutral-7">
                集成化开发环境，减少上下文切换，提升开发效率
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-neutral-2 rounded-xl border border-neutral-5 p-8 mb-16 shadow-whisper">
          <h2 className="font-serif text-title-28 font-medium text-neutral-10 mb-6 text-center">核心优势</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-neutral-10 mb-2">全栈 TypeScript</h4>
                <p className="text-neutral-7">端到端的类型安全，减少运行时错误</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-neutral-10 mb-2">现代化架构</h4>
                <p className="text-neutral-7">Next.js + Express + PostgreSQL</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-neutral-10 mb-2">实时通信</h4>
                <p className="text-neutral-7">WebSocket + Socket.IO 实现毫秒级同步</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-neutral-10 mb-2">开源友好</h4>
                <p className="text-neutral-7">MIT 许可，自由定制和扩展</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="font-serif text-title-28 font-medium text-neutral-10 mb-4">开始使用</h2>
          <p className="text-neutral-7 mb-8">
            立即注册，体验全新的团队协作开发方式
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg">
                免费注册
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline">
                了解更多
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
