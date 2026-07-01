'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, User } from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';

function NewTaskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    projectId: searchParams.get('projectId') || '',
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    assigneeId: '',
    dueDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/tasks', formData);
      router.push('/tasks');
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-1">
            <div className="container mx-auto max-w-3xl px-6 py-8">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-neutral-7 hover:text-neutral-9 mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                返回
              </button>

              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-title-24">新建任务</CardTitle>
                  <CardDescription>创建一个新的任务并分配给团队成员</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="p-3 rounded-lg bg-error/10 text-error text-copy-13">
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="title" className="text-copy-13 font-medium">
                        任务标题 <span className="text-error">*</span>
                      </label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="输入任务标题"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="description" className="text-copy-13 font-medium">
                        描述
                      </label>
                      <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="输入任务描述"
                        className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-neutral-5 bg-neutral-2 text-neutral-9 placeholder:text-neutral-6 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="priority" className="text-copy-13 font-medium">
                          优先级
                        </label>
                        <select
                          id="priority"
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-lg border border-neutral-5 bg-neutral-2 text-neutral-9 focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <option value="LOW">低</option>
                          <option value="MEDIUM">中</option>
                          <option value="HIGH">高</option>
                          <option value="URGENT">紧急</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="dueDate" className="text-copy-13 font-medium">
                          截止日期
                        </label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="assigneeId" className="text-copy-13 font-medium">
                        负责人
                      </label>
                      <div className="flex gap-2">
                        <Input
                          id="assigneeId"
                          value={formData.assigneeId}
                          onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                          placeholder="用户 ID (暂时手动填写)"
                        />
                        <Button type="button" variant="outline" size="icon">
                          <User className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button type="submit" disabled={loading}>
                        {loading ? '创建中...' : '创建任务'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                      >
                        取消
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
    </TeamGuard>
  );
}

export default function NewTaskPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-neutral-1">
        <div className="text-neutral-7">加载中...</div>
      </div>
    }>
      <NewTaskForm />
    </Suspense>
  );
}
