'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';

interface Project {
  id: string;
  name: string;
}

export default function NewReviewPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
  });

  useEffect(() => {
    if (!token) return;
    fetchProjects();
  }, [token]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects || []);
    } catch (err) {
      console.error('获取项目列表失败:', err);
    } finally {
      setFetchingProjects(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/reviews', formData);
      router.push(`/reviews/${response.data.review.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '创建审查失败');
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
            <div className="container mx-auto max-w-2xl px-6 py-8">
              <Button
                variant="ghost"
                onClick={() => router.push('/reviews')}
                className="mb-6"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回
              </Button>

              <div className="mb-6">
                <h1 className="font-serif text-3xl font-medium text-neutral-10 mb-2">
                  创建审查
                </h1>
                <p className="text-neutral-7">
                  选择项目和文件，创建新的代码审查
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>审查信息</CardTitle>
                  <CardDescription>
                    填写审查的基本信息
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="p-3 text-sm text-error bg-error/10 rounded-lg border border-error/30">
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="projectId" className="text-sm font-medium text-neutral-9">
                        项目 <span className="text-error">*</span>
                      </label>
                      <select
                        id="projectId"
                        value={formData.projectId}
                        onChange={(e) =>
                          setFormData({ ...formData, projectId: e.target.value })
                        }
                        required
                        className="flex h-10 w-full rounded-lg border border-neutral-5 bg-neutral-1 px-3 py-2 text-sm text-neutral-9 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-2"
                        disabled={fetchingProjects}
                      >
                        <option value="">
                          {fetchingProjects ? '加载中...' : '请选择项目'}
                        </option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="title" className="text-sm font-medium text-neutral-9">
                        标题 <span className="text-error">*</span>
                      </label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder="例如：重构用户模块认证逻辑"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="description" className="text-sm font-medium text-neutral-9">
                        描述
                      </label>
                      <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="描述审查的目标和关注点..."
                        className="flex min-h-[120px] w-full rounded-lg border border-neutral-5 bg-neutral-1 px-3 py-2 text-sm text-neutral-9 placeholder:text-neutral-6 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200"
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button type="submit" disabled={loading || fetchingProjects}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {loading ? '创建中...' : '创建审查'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/reviews')}
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
