'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft } from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';

export default function NewProjectPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'PRIVATE' as 'PUBLIC' | 'PRIVATE',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/projects', formData);
      router.push(`/projects/${response.data.project.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '创建项目失败');
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
          <main className="flex-1 overflow-y-auto bg-muted/40">
            <div className="container py-6">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="mb-6"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回
              </Button>

              <div className="max-w-2xl">
                <h1 className="text-3xl font-bold mb-2">新建项目</h1>
                <p className="text-muted-foreground mb-6">
                  创建您的新项目，开始团队协作
                </p>

                <Card>
                  <CardHeader>
                    <CardTitle>项目信息</CardTitle>
                    <CardDescription>
                      填写项目基本信息
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                          {error}
                        </div>
                      )}

                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                          项目名称 *
                        </label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="例如：电子商务平台"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium">
                          项目描述
                        </label>
                        <textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                          placeholder="描述项目的目标和功能..."
                          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">可见性</label>
                        <div className="flex gap-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="visibility"
                              value="PRIVATE"
                              checked={formData.visibility === 'PRIVATE'}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  visibility: e.target.value as 'PUBLIC' | 'PRIVATE',
                                })
                              }
                              className="h-4 w-4"
                            />
                            <span>私有 (仅成员可见)</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="visibility"
                              value="PUBLIC"
                              checked={formData.visibility === 'PUBLIC'}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  visibility: e.target.value as 'PUBLIC' | 'PRIVATE',
                                })
                              }
                              className="h-4 w-4"
                            />
                            <span>公开 (所有人可见)</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <Button type="submit" disabled={loading}>
                          {loading ? '创建中...' : '创建项目'}
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
            </div>
          </main>
        </div>
      </div>
    </div>
    </TeamGuard>
  );
}
