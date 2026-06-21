'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { TeamGuard } from '@/components/TeamGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  GitBranch,
  Plus,
  FolderGit2,
  Globe,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';

const providerLabels: Record<string, string> = {
  INTERNAL: '内置',
  GITHUB: 'GitHub',
  GITLAB: 'GitLab',
};

const providerColors: Record<string, string> = {
  INTERNAL: 'bg-neutral-3 text-neutral-7',
  GITHUB: 'bg-neutral-3 text-neutral-9',
  GITLAB: 'bg-warning/15 text-warning',
};

export default function ProjectReposPage() {
  const router = useRouter();
  const params = useParams();
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    provider: 'INTERNAL',
  });

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token, params.id]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [projectRes, reposRes] = await Promise.all([
        api.get(`/projects/${params.id}`),
        api.get('/repositories', { params: { projectId: params.id } }),
      ]);
      setProject(projectRes.data.project);
      setRepos(reposRes.data.repositories || reposRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || '获取仓库列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/repositories', {
        projectId: params.id,
        name: formData.name.trim(),
        url: formData.url.trim() || undefined,
        provider: formData.provider,
      });
      setShowCreate(false);
      setFormData({ name: '', url: '', provider: 'INTERNAL' });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || '创建仓库失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <TeamGuard>
        <div className="flex h-screen overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto bg-neutral-1">
                <div className="container py-8 px-6">
                  <div className="animate-pulse mb-6 h-5 w-48 rounded bg-neutral-3" />
                  <div className="animate-pulse mb-8 h-9 w-64 rounded bg-neutral-3" />
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-xl border border-neutral-5 bg-neutral-2 p-6">
                        <div className="animate-pulse h-5 w-32 rounded bg-neutral-3 mb-3" />
                        <div className="animate-pulse h-4 w-20 rounded bg-neutral-3 mb-2" />
                        <div className="animate-pulse h-4 w-48 rounded bg-neutral-3 mb-2" />
                        <div className="animate-pulse h-4 w-36 rounded bg-neutral-3" />
                      </div>
                    ))}
                  </div>
                </div>
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
              <div className="container py-8 px-6">
                {/* Back link + breadcrumb */}
                <div className="flex items-center gap-2 mb-6">
                  <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-neutral-7 hover:text-neutral-9 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">返回项目</span>
                  </button>
                  {project && (
                    <>
                      <span className="text-neutral-5">/</span>
                      <Link
                        href={`/projects/${params.id}`}
                        className="text-sm text-neutral-7 hover:text-neutral-9 transition-colors"
                      >
                        {project.name}
                      </Link>
                      <span className="text-neutral-5">/</span>
                      <span className="text-sm text-neutral-9">仓库管理</span>
                    </>
                  )}
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="font-serif text-3xl font-medium text-neutral-10">
                      仓库管理
                    </h1>
                    <p className="text-sm text-neutral-7 mt-1">
                      管理项目关联的 Git 仓库
                    </p>
                  </div>
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    添加仓库
                  </Button>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-error">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{error}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      重试
                    </Button>
                  </div>
                )}

                {/* Empty state */}
                {!error && repos.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-2 flex items-center justify-center mb-4">
                      <FolderGit2 className="h-8 w-8 text-neutral-6" />
                    </div>
                    <h3 className="font-serif text-lg text-neutral-10 mb-2">暂无仓库</h3>
                    <p className="text-sm text-neutral-7 mb-6">还没有添加任何 Git 仓库</p>
                    <Button onClick={() => setShowCreate(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      添加仓库
                    </Button>
                  </div>
                )}

                {/* Repo grid */}
                {repos.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {repos.map((repo: any) => (
                      <button
                        key={repo.id}
                        onClick={() => router.push(`/projects/${params.id}/repos/${repo.id}`)}
                        className="text-left"
                      >
                        <Card className="h-full transition-shadow hover:shadow-float cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base truncate">{repo.name}</CardTitle>
                              <span
                                className={`shrink-0 text-xs px-2 py-0.5 rounded-md font-medium ${
                                  providerColors[repo.provider] || providerColors.INTERNAL
                                }`}
                              >
                                {providerLabels[repo.provider] || repo.provider}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {repo.url && (
                              <div className="flex items-center gap-1.5 text-sm text-neutral-7 truncate">
                                <Globe className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{repo.url}</span>
                              </div>
                            )}
                            {repo.defaultBranch && (
                              <div className="flex items-center gap-1.5 text-sm text-neutral-7">
                                <GitBranch className="h-3.5 w-3.5 shrink-0" />
                                <span>{repo.defaultBranch}</span>
                              </div>
                            )}
                            <p className="text-xs text-neutral-6">
                              创建于 {formatDate(repo.createdAt)}
                            </p>
                          </CardContent>
                        </Card>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Create repo modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-neutral-10/20 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md mx-4 rounded-xl border border-neutral-5 bg-neutral-2 shadow-float">
            <div className="flex items-center justify-between p-6 border-b border-neutral-5">
              <h2 className="font-serif text-lg font-medium text-neutral-10">添加仓库</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded-lg hover:bg-neutral-3 text-neutral-7 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-9">仓库名称</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入仓库名称"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-9">仓库 URL（可选）</label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://github.com/user/repo"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-9">仓库来源</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-neutral-5 bg-neutral-1 px-3 py-2 text-sm text-neutral-9 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                >
                  <option value="INTERNAL">内置仓库</option>
                  <option value="GITHUB">GitHub</option>
                  <option value="GITLAB">GitLab</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 pt-0">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={submitting || !formData.name.trim()}>
                {submitting ? '创建中...' : '创建仓库'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </TeamGuard>
  );
}
