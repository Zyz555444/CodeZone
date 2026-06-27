'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Users, Mail, Crown, Shield, User, Clock, Copy, Check, X, Code } from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface TeamMember {
  id: string;
  role: string;
  status: string;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
  };
}

interface PendingMember {
  id: string;
  role: string;
  status: string;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
  };
}

interface TeamData {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  members: TeamMember[];
  _count: {
    projects: number;
  };
}

const roleConfig: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  OWNER:     { label: '创建者', icon: Crown, color: 'text-warning' },
  ADMIN:     { label: '管理员', icon: Shield, color: 'text-accent' },
  MODERATOR: { label: '协管员', icon: Shield, color: 'text-neutral-6' },
  MEMBER:    { label: '成员', icon: User, color: 'text-neutral-7' },
};

export default function TeamPage() {
  const user = useAuthStore((s) => s.user);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const currentMembership = team?.members?.find(m => m.user.id === user?.id);
  const currentRole = currentMembership?.role;
  const isAdmin = currentRole === 'OWNER' || currentRole === 'ADMIN';

  const fetchTeam = async () => {
    try {
      // 获取团队列表，取第一个活跃的团队
      const { data: teamsData } = await api.get('/teams');
      if (teamsData.teams && teamsData.teams.length > 0) {
        const activeTeam = teamsData.teams[0];
        // 获取完整的团队详情（含成员列表）
        const { data: detailData } = await api.get(`/teams/${activeTeam.id}`);
        setTeam(detailData.team);
      }
    } catch (err: any) {
      setError('获取团队信息失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingMembers = async () => {
    if (!team || !isAdmin) return;
    try {
      const { data } = await api.get(`/teams/${team.id}/pending-members`);
      setPendingMembers(data.pendingMembers);
    } catch (err) {
      console.error('获取待审核成员失败:', err);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  useEffect(() => {
    fetchPendingMembers();
  }, [team, isAdmin]);

  const handleCopyInviteCode = async () => {
    if (!team?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      void 0;
    }
  };

  const handleApprove = async (userId: string) => {
    if (!team) return;
    setActionLoading(userId);
    try {
      await api.post(`/teams/${team.id}/members/${userId}/approve`);
      // 刷新数据
      await Promise.all([fetchTeam(), fetchPendingMembers()]);
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!team) return;
    setActionLoading(userId);
    try {
      await api.delete(`/teams/${team.id}/members/${userId}/reject`);
      await fetchPendingMembers();
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!team) return;
    setActionLoading(userId);
    try {
      await api.put(`/teams/${team.id}/members/${userId}/role`, { role: newRole });
      setError('');
      await fetchTeam();
    } catch (err: any) {
      setError(err.response?.data?.error || '角色变更失败');
    } finally {
      setActionLoading(null);
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
              <main className="flex-1 flex items-center justify-center bg-neutral-1">
                <div className="animate-pulse text-neutral-7">加载中...</div>
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
            <div className="container mx-auto max-w-5xl px-6 py-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="font-serif text-title-28 font-medium text-neutral-10">
                    {team?.name || '团队'}
                  </h1>
                  <p className="text-neutral-7 mt-1">
                    {isAdmin ? '管理团队成员和权限' : '团队成员列表'}
                  </p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-copy-13 text-error">
                  {error}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center">
                      <Users className="h-6 w-6 text-neutral-6" />
                    </div>
                    <div>
                      <p className="text-title-24 font-medium text-neutral-10">
                        {team?.members?.filter(m => m.status === 'ACTIVE').length || 0}
                      </p>
                      <p className="text-copy-13 text-neutral-7">团队成员</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center">
                      <Crown className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-title-24 font-medium text-neutral-10">
                        {team?.members?.filter(m => m.role === 'OWNER' || m.role === 'ADMIN').length || 0}
                      </p>
                      <p className="text-copy-13 text-neutral-7">管理员</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center">
                      <Code className="h-6 w-6 text-neutral-6" />
                    </div>
                    <div>
                      <p className="text-title-24 font-medium text-neutral-10">
                        {team?._count?.projects || 0}
                      </p>
                      <p className="text-copy-13 text-neutral-7">项目</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 邀请码（管理员可见） */}
              {isAdmin && (
                <Card className="mb-6 border-accent/30">
                  <CardHeader>
                    <CardTitle className="font-serif text-copy-16 flex items-center gap-2">
                      团队邀请码
                    </CardTitle>
                    <CardDescription>
                      将此邀请码分享给其他人，他们可以申请加入团队
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-neutral-2 rounded-lg p-3 text-center">
                        <p className="text-title-24 font-mono font-medium tracking-[0.3em] text-accent select-all">
                          {team?.inviteCode}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleCopyInviteCode}
                        className="gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 text-success" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            复制
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 审核中成员 */}
              {isAdmin && pendingMembers.length > 0 && (
                <Card className="mb-6 border-warning/30">
                  <CardHeader>
                    <CardTitle className="font-serif text-copy-16 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-warning" />
                      待审核成员 ({pendingMembers.length})
                    </CardTitle>
                    <CardDescription>
                      以下成员申请加入团队，请审核
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-neutral-5">
                      {pendingMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-neutral-2 flex items-center justify-center">
                              <span className="text-copy-13 font-medium text-neutral-7">
                                {member.user.username[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-neutral-10">{member.user.username}</p>
                              <div className="flex items-center gap-2 text-copy-13 text-neutral-7">
                                <Mail className="h-3 w-3" />
                                {member.user.email}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success border-success/30 hover:bg-success/10"
                              onClick={() => handleApprove(member.user.id)}
                              disabled={actionLoading === member.user.id}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              {actionLoading === member.user.id ? '处理中...' : '通过'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-error border-error/30 hover:bg-error/10"
                              onClick={() => handleReject(member.user.id)}
                              disabled={actionLoading === member.user.id}
                            >
                              <X className="h-4 w-4 mr-1" />
                              拒绝
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 成员列表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-copy-16">所有成员</CardTitle>
                  <CardDescription>
                    团队中的活跃成员列表
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {team?.members?.filter(m => m.status === 'ACTIVE').length === 0 ? (
                    <div className="text-center py-8 text-neutral-7">
                      暂无成员
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-5">
                      {team?.members?.filter(m => m.status === 'ACTIVE').map((member) => {
                        const role = roleConfig[member.role] || { label: member.role, icon: User, color: 'text-neutral-7' };
                        const RoleIcon = role.icon;
                        const isMe = member.user.id === user?.id;
                        const isTargetOwner = member.role === 'OWNER';

                        const availableRoles = ['ADMIN', 'MODERATOR', 'MEMBER'].filter(r => r !== member.role);
                        const canChangeRole = isAdmin && !isMe && (!isTargetOwner || currentRole === 'OWNER');

                        return (
                          <div key={member.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center">
                                <span className="text-copy-16 font-medium text-neutral-7">
                                  {member.user.username[0].toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-neutral-10">
                                  {member.user.username}
                                  {isMe && <span className="text-label-12 text-neutral-6 ml-2">(你)</span>}
                                </p>
                                <div className="flex items-center gap-2 text-copy-13 text-neutral-7">
                                  <Mail className="h-3 w-3" />
                                  {member.user.email}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-2 ${role.color}`}>
                                <RoleIcon className="h-4 w-4" />
                                <span className="text-copy-13 font-medium">{role.label}</span>
                              </div>

                              {canChangeRole && (
                                <select
                                  className="text-copy-13 border border-neutral-5 rounded-lg bg-neutral-1 px-2 py-1.5 text-neutral-10 cursor-pointer focus:outline-none focus:border-accent/50 disabled:opacity-50"
                                  value=""
                                  disabled={actionLoading === member.user.id}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleRoleChange(member.user.id, e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                >
                                  <option value="" disabled>角色</option>
                                  {availableRoles.map(r => (
                                    <option key={r} value={r}>{roleConfig[r]?.label || r}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
