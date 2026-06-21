'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { TeamGuard } from '@/components/TeamGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  GitBranch,
  Globe,
  GitCommit,
  Plus,
  FolderGit2,
  AlertCircle,
  RefreshCw,
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

export default function RepoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [repo, setRepo] = useState<any>(null);
  const [commits, setCommits] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'commits' | 'branches'>('commits');
  const [showAddCommit, setShowAddCommit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commitForm, setCommitForm] = useState({
    message: '',
    branch: '',
  });

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token, params.id, params.repoId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [repoRes, commitsRes, branchesRes] = await Promise.all([
        api.get(`/repositories/${params.repoId}`),
        api.get(`/repositories/${params.repoId}/commits`),
        api.get(`/repositories/${params.repoId}/branches`),
      ]);
      const repoData = repoRes.data.repository || repoRes.data;
      setRepo(repoData);
      setCommits(commitsRes.data.commits || commitsRes.data || []);
      setBranches(branchesRes.data.branches || branchesRes.data || []);
      const defaultBranch = repoData.defaultBranch || (branchesRes.data?.length > 0 ? branchesRes.data[0].name : 'main');
      setCommitForm((prev) => ({ ...prev, branch: defaultBranch }));
    } catch (err: any) {
      setError(err.response?.data?.error || '获取仓库详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCommit = async () => {
    if (!commitForm.message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/repositories/${params.repoId}/commits`, {
        message: commitForm.message.trim(),
        branch: commitForm.branch || repo.defaultBranch || 'main',
      });
      setShowAddCommit(false);
      setCommitForm((prev) => ({ ...prev, message: '' }));
      const commitsRes = await api.get(`/repositories/${params.repoId}/commits`);
      setCommits(commitsRes.data.commits || commitsRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || '创建提交失败');
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
                  <div className="animate-pulse mb-2 h-9 w-64 rounded bg-neutral-3" />
                  <div className="animate-pulse mb-8 h-5 w-96 rounded bg-neutral-3" />
                  <div className="animate-pulse h-10 w-72 rounded-lg bg-neutral-3 mb-6" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="animate-pulse h-16 rounded-xl bg-neutral-2 border border-neutral-5" />
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

  if (!repo) {
    return (
      <TeamGuard>
        <div className="flex h-screen overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto bg-neutral-1">
                <div className="container py-8 px-6 flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-2 flex items-center justify-center mb-4">
                    <FolderGit2 className="h-8 w-8 text-neutral-6" />
                  </div>
                  <h3 className="font-serif text-lg text-neutral-10 mb-2">仓库不存在</h3>
                  <p className="text-sm text-neutral-7 mb-6">未找到该仓库，可能已被删除</p>
                  <Button variant="secondary" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回
                  </Button>
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
                {/* Back */}
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 text-neutral-7 hover:text-neutral-9 mb-6 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-sm">返回仓库列表</span>
                </button>

                {/* Repo Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center">
                      <FolderGit2 className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h1 className="font-serif text-2xl font-medium text-neutral-10">
                        {repo.name}
                      </h1>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                            providerColors[repo.provider] || providerColors.INTERNAL
                          }`}
                        >
                          {providerLabels[repo.provider] || repo.provider}
                        </span>
                        {repo.url && (
                          <span className="flex items-center gap-1 text-sm text-neutral-7">
                            <Globe className="h-3.5 w-3.5" />
                            {repo.url}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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

                {/* Tabs */}
                <div className="flex gap-1 border-b border-neutral-5 mb-6">
                  <button
                    onClick={() => setActiveTab('commits')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      activeTab === 'commits'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-neutral-7 hover:text-neutral-9'
                    }`}
                  >
                    <GitCommit className="h-4 w-4" />
                    提交记录
                  </button>
                  <button
                    onClick={() => setActiveTab('branches')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      activeTab === 'branches'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-neutral-7 hover:text-neutral-9'
                    }`}
                  >
                    <GitBranch className="h-4 w-4" />
                    分支
                  </button>
                </div>

                {/* Commits Tab */}
                {activeTab === 'commits' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-serif text-lg text-neutral-10">提交记录</h2>
                      <Button size="sm" onClick={() => setShowAddCommit(true)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        添加提交
                      </Button>
                    </div>

                    {commits.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-14 h-14 rounded-2xl bg-neutral-2 flex items-center justify-center mb-4">
                          <GitCommit className="h-7 w-7 text-neutral-6" />
                        </div>
                        <h3 className="font-serif text-base text-neutral-10 mb-2">暂无提交</h3>
                        <p className="text-sm text-neutral-7 mb-6">该仓库还没有任何提交记录</p>
                        <Button size="sm" onClick={() => setShowAddCommit(true)}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          添加提交
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {commits.map((commit: any) => (
                          <div
                            key={commit.id}
                            className="flex items-center gap-4 px-5 py-3.5 rounded-xl border border-neutral-5 bg-neutral-2"
                          >
                            <span className="font-mono text-sm text-accent shrink-0">
                              {commit.hash ? commit.hash.slice(0, 7) : commit.id?.slice(0, 7)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-neutral-9 truncate">{commit.message}</p>
                              <div className="flex items-center gap-3 mt-1">
                                {commit.branch && (
                                  <span className="flex items-center gap-1 text-xs text-neutral-7">
                                    <GitBranch className="h-3 w-3" />
                                    {commit.branch}
                                  </span>
                                )}
                                <span className="text-xs text-neutral-6">
                                  {formatDate(commit.createdAt || commit.date)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add commit inline form */}
                    {showAddCommit && (
                      <div className="mt-4 rounded-xl border border-accent/30 bg-accent-subtle p-5">
                        <h3 className="font-serif text-base text-neutral-10 mb-4">新提交</h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-9">提交信息</label>
                            <Input
                              value={commitForm.message}
                              onChange={(e) => setCommitForm({ ...commitForm, message: e.target.value })}
                              placeholder="描述此次提交的变更内容"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddCommit()}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-9">分支</label>
                            {branches.length > 0 ? (
                              <select
                                value={commitForm.branch}
                                onChange={(e) => setCommitForm({ ...commitForm, branch: e.target.value })}
                                className="flex h-10 w-full rounded-lg border border-neutral-5 bg-neutral-1 px-3 py-2 text-sm text-neutral-9 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                              >
                                {branches.map((b: any) => (
                                  <option key={b.name} value={b.name}>
                                    {b.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                value={commitForm.branch}
                                onChange={(e) => setCommitForm({ ...commitForm, branch: e.target.value })}
                                placeholder="main"
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-5">
                          <Button variant="secondary" size="sm" onClick={() => setShowAddCommit(false)}>
                            取消
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAddCommit}
                            disabled={submitting || !commitForm.message.trim()}
                          >
                            {submitting ? '提交中...' : '提交'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Branches Tab */}
                {activeTab === 'branches' && (
                  <div>
                    <h2 className="font-serif text-lg text-neutral-10 mb-4">分支列表</h2>

                    {branches.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-14 h-14 rounded-2xl bg-neutral-2 flex items-center justify-center mb-4">
                          <GitBranch className="h-7 w-7 text-neutral-6" />
                        </div>
                        <h3 className="font-serif text-base text-neutral-10 mb-2">暂无分支</h3>
                        <p className="text-sm text-neutral-7">该仓库还没有任何分支</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {branches.map((branch: any) => {
                          return (
                            <div
                              key={branch.name}
                              className="flex items-center justify-between px-5 py-3.5 rounded-xl border border-neutral-5 bg-neutral-2"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center">
                                  <GitBranch className="h-4.5 w-4.5 text-accent" />
                                </div>
                                <div>
                                  <p className="font-medium text-neutral-10">{branch.name}</p>
                                  <p className="text-xs text-neutral-7">
                                    {branchCommitCount(branch.name, commits)} 次提交
                                  </p>
                                </div>
                              </div>
                              {branch.name === repo.defaultBranch && (
                                <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-3 text-neutral-6">
                                  默认
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </TeamGuard>
  );
}

function branchCommitCount(branchName: string, commits: any[]): number {
  return commits.filter((c: any) => c.branch === branchName).length;
}
