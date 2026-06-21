'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, UserPlus, Code, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

export default function TeamSetupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setTeamStatus = useAuthStore((s) => s.setTeamStatus);
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTeam, setCreatedTeam] = useState<{ name: string; inviteCode: string } | null>(null);
  const [joinResult, setJoinResult] = useState<{ success: boolean; message: string; teamName?: string } | null>(null);
  const [checkingTeam, setCheckingTeam] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    api.get('/auth/me').then(({ data }) => {
      if (cancelled) return;
      setTeamStatus(data.hasTeam, data.teams || []);
      if (data.hasTeam) {
        router.replace('/dashboard');
      } else {
        setCheckingTeam(false);
      }
    }).catch(() => {
      if (cancelled) return;
      setCheckingTeam(false);
    });

    return () => { cancelled = true; };
  }, [isAuthenticated, router, setTeamStatus]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/teams', { name: teamName.trim() });
      setTeamStatus(true, [{ id: data.team.id, name: data.team.name, inviteCode: data.team.inviteCode }]);
      setCreatedTeam({
        name: data.team.name,
        inviteCode: data.team.inviteCode,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || '创建团队失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError('');
    setJoinResult(null);

    try {
      const { data } = await api.post('/teams/join', { inviteCode: inviteCode.trim().toUpperCase() });
      setJoinResult({ success: true, message: data.message, teamName: data.teamName });
    } catch (err: any) {
      setJoinResult({ success: false, message: err.response?.data?.error || '加入失败' });
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => router.push('/dashboard');

  if (!isAuthenticated || checkingTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-1">
        <div className="animate-pulse text-neutral-7">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-1 p-4">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-neutral-5) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Code className="w-8 h-8 text-accent" />
            <span className="text-2xl font-serif font-medium text-neutral-10">CodeZone</span>
          </div>
          <p className="text-neutral-7">欢迎，{user?.username}</p>
        </div>

        {createdTeam && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-success" />
                <CardTitle>团队创建成功</CardTitle>
              </div>
              <CardDescription>
                团队「{createdTeam.name}」已创建，你已自动成为管理员
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-neutral-3 rounded-lg p-4 text-center">
                <p className="text-sm text-neutral-7 mb-2">团队邀请码（分享给成员加入）</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-accent select-all">
                  {createdTeam.inviteCode}
                </p>
              </div>
              <Button onClick={goToDashboard} className="w-full" size="lg">
                进入工作台 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {joinResult && !joinResult.success && (
          <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg flex items-center gap-2 text-error">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{joinResult.message}</span>
          </div>
        )}

        {joinResult && joinResult.success && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-success" />
                <CardTitle>申请已提交</CardTitle>
              </div>
              <CardDescription>
                已向「{joinResult.teamName}」提交加入申请，请等待管理员审核
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-7 mb-4">
                审核通过后你将可以访问团队的所有功能。你也可以返回创建自己的团队。
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setJoinResult(null); setMode('choose'); }} className="flex-1">
                  返回
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === 'choose' && !createdTeam && !joinResult && (
          <div className="space-y-4">
            <Card className="hover:border-accent/50 transition-colors cursor-pointer" onClick={() => setMode('create')}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">创建新团队</CardTitle>
                    <CardDescription>创建一个全新的团队，你将自动成为管理员</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="hover:border-accent/50 transition-colors cursor-pointer" onClick={() => setMode('join')}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">加入已有团队</CardTitle>
                    <CardDescription>输入团队邀请码申请加入，等待管理员审核</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        {mode === 'create' && !createdTeam && (
          <Card>
            <CardHeader>
              <CardTitle>创建团队</CardTitle>
              <CardDescription>输入团队名称，系统将自动生成邀请码</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                {error && (
                  <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-9 mb-1">团队名称</label>
                  <Input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="例如：前端开发组、产品设计团队"
                    maxLength={50}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => { setMode('choose'); setError(''); }} className="flex-1">
                    返回
                  </Button>
                  <Button type="submit" disabled={loading || !teamName.trim()} className="flex-1">
                    {loading ? '创建中...' : '创建团队'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === 'join' && !joinResult && (
          <Card>
            <CardHeader>
              <CardTitle>加入团队</CardTitle>
              <CardDescription>输入管理员分享的邀请码来申请加入团队</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinTeam} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-9 mb-1">邀请码</label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="输入 8 位邀请码"
                    maxLength={8}
                    className="font-mono text-lg tracking-widest text-center"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => { setMode('choose'); setError(''); setJoinResult(null); }} className="flex-1">
                    返回
                  </Button>
                  <Button type="submit" disabled={loading || inviteCode.trim().length < 4} className="flex-1">
                    {loading ? '提交中...' : '申请加入'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
