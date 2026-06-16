'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check } from 'lucide-react';

export default function PricingPage() {
  const plans = [
    {
      name: '免费版',
      price: '0',
      description: '适合个人开发者和小型项目',
      features: ['最多 5 个项目', '100MB 存储空间', '基础协作功能', '社区支持'],
      cta: '免费开始',
      popular: false,
    },
    {
      name: '专业版',
      price: '49',
      description: '适合成长中的团队',
      features: ['无限项目', '10GB 存储空间', '高级协作功能', '代码审查', 'CI/CD 流水线', '优先支持'],
      cta: '开始试用',
      popular: true,
    },
    {
      name: '企业版',
      price: '199',
      description: '适合大型企业',
      features: ['无限一切', '1TB 存储空间', '专属客户经理', 'SAML SSO', '审计日志', 'SLA 保障', '现场培训'],
      cta: '联系销售',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-1">
      <div className="container mx-auto max-w-6xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="font-serif text-5xl font-medium text-neutral-10 mb-4">定价方案</h1>
          <p className="text-xl text-neutral-7">选择适合您团队的方案</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.popular ? 'relative border-accent shadow-float' : ''}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white px-3 py-1 rounded-full text-sm font-medium">
                  最受欢迎
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="font-serif text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <span className="text-5xl font-bold text-neutral-10">{plan.price}</span>
                  <span className="text-lg text-neutral-7">/月</span>
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-success" />
                      <span className="text-sm text-neutral-8">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
