'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Code2, Users, GitBranch, Zap, BarChart3 } from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: Code2,
      title: '实时协作编辑',
      description: '多人同时编辑代码，零冲突同步',
    },
    {
      icon: Users,
      title: '团队管理',
      description: '完整的项目管理与成员协作体系',
    },
    {
      icon: GitBranch,
      title: '代码审查',
      description: '专业的代码审查流程与质量把控',
    },
    {
      icon: Zap,
      title: '高效开发',
      description: '集成化开发环境，提升团队效率',
    },
    {
      icon: BarChart3,
      title: '数据分析',
      description: '实时数据可视化与洞察',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-neutral-5) 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }} />
        </div>

        <div className="container relative mx-auto max-w-6xl px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-neutral-2 px-4 py-1.5 text-sm text-neutral-7 mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              v1.0.0 现已发布
            </div>

            {/* Title */}
            <h1 className="font-serif text-5xl md:text-6xl font-medium leading-tight text-neutral-10 mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
              团队协作
              <br />
              <span className="text-accent">从写代码开始</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-neutral-7 mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '200ms' }}>
              集实时协作编辑、项目管理、代码审查于一体的开发平台。
              <br className="hidden md:block" />
              让团队专注于创造，而非工具。
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '300ms' }}>
              <Link href="/register">
                <Button size="lg" className="gap-2 text-base px-8">
                  免费开始
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="secondary" className="text-base px-8">
                  了解更多
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-neutral-2">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-medium text-neutral-10 mb-4">
              极简设计，强大功能
            </h2>
            <p className="text-neutral-7 max-w-xl mx-auto">
              一种主色，三档中性灰，剩下的都是留白
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-neutral-5 bg-neutral-1 p-6 transition-all duration-300 hover:shadow-float hover:border-accent/30 animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-lg bg-neutral-2 flex items-center justify-center mb-4 group-hover:bg-accent-subtle transition-colors">
                    <Icon className="h-6 w-6 text-neutral-7 group-hover:text-accent transition-colors" />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-neutral-10 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-neutral-7 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="rounded-2xl border border-neutral-5 bg-neutral-2 p-12 text-center">
            <h2 className="font-serif text-3xl font-medium text-neutral-10 mb-4">
              准备开始了吗？
            </h2>
            <p className="text-neutral-7 mb-8 max-w-md mx-auto">
              立即注册，与团队一起体验全新的协作开发方式
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  立即注册
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline">
                  了解更多
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-5 py-12">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-serif text-lg font-medium text-neutral-10">
              CodeZone
            </div>
            <div className="flex items-center gap-6 text-sm text-neutral-7">
              <Link href="/about" className="hover:text-neutral-10 transition-colors">关于</Link>
              <Link href="/features" className="hover:text-neutral-10 transition-colors">功能</Link>
              <Link href="/pricing" className="hover:text-neutral-10 transition-colors">定价</Link>
              <Link href="/docs" className="hover:text-neutral-10 transition-colors">文档</Link>
            </div>
            <div className="text-sm text-neutral-6">
              © 2026 CodeZone. MIT License.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
