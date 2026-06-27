'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TeamGuard } from '@/components/TeamGuard';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/lib/utils';
import { Mail, Shield, Calendar, Users, FolderGit2, CheckSquare, MessageSquare, RefreshCw } from 'lucide-react';

interface ProfileData {
  username: string;
  email: string;
  avatar?: string;
  role: string;
  bio: string;
  createdAt: string;
  memberCount?: number;
  stats?: {
    projects: number;
    tasks: number;
    reviews: number;
  };
}

const roleConfig: Record<string, { label: string; className: string }> = {
  ADMIN: { label: '管理员', className: 'bg-error text-white' },
  OWNER: { label: '拥有者', className: 'bg-accent text-white' },
  MANAGER: { label: '管理者', className: 'bg-info text-white' },
  MEMBER: { label: '成员', className: 'bg-neutral-3 text-neutral-8' },
};

const defaultRole = { label: '成员', className: 'bg-neutral-3 text-neutral-8' };

export default function ProfilePage() {
  const teams = useAuthStore((s) => s.teams);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  const fetchProfile = () => {
    setLoading(true);
    setError(false);
    api.get('/auth/me').then(({ data }) => {
      if (data.user) {
        setProfileData({
          username: data.user.username || '',
          email: data.user.email || '',
          avatar: data.user.avatar,
          role: data.user.role || 'MEMBER',
          bio: data.user.bio || '',
          createdAt: data.user.createdAt || '',
          memberCount: data.memberCount,
          stats: data.stats,
        });
      }
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const getInitials = (name: string): string => {
    return name?.charAt(0)?.toUpperCase() || '?';
  };

  const role = profileData ? (roleConfig[profileData.role] || defaultRole) : defaultRole;
  const teamName = teams.length > 0 ? teams[0].name : null;
  const memberCount = profileData?.memberCount ?? teams.length;
  const stats = profileData?.stats || { projects: 0, tasks: 0, reviews: 0 };

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-1">
            <div className="container mx-auto max-w-4xl px-6 py-8">
              {loading ? (
                <div className="space-y-8 animate-pulse">
                  <div className="h-8 w-32 rounded-lg bg-neutral-3" />
                  {/* 头像和信息骨架 */}
                  <Card>
                    <CardContent>
                      <div className="flex flex-col items-center gap-6 pt-6 sm:flex-row sm:items-start">
                        <div className="h-24 w-24 rounded-2xl bg-neutral-3" />
                        <div className="flex-1 space-y-3 text-center sm:text-left">
                          <div className="h-7 w-40 rounded-lg bg-neutral-3 mx-auto sm:mx-0" />
                          <div className="inline-block h-6 w-16 rounded-full bg-neutral-3" />
                          <div className="h-4 w-64 rounded-lg bg-neutral-3 mx-auto sm:mx-0" />
                          <div className="h-4 w-48 rounded-lg bg-neutral-3 mx-auto sm:mx-0" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* 统计骨架 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 rounded-xl bg-neutral-2 border border-neutral-5" />
                    <div className="h-24 rounded-xl bg-neutral-2 border border-neutral-5" />
                    <div className="h-24 rounded-xl bg-neutral-2 border border-neutral-5" />
                  </div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="h-16 w-16 rounded-2xl bg-neutral-2 flex items-center justify-center mb-4">
                    <RefreshCw className="h-8 w-8 text-neutral-6" />
                  </div>
                  <p className="text-neutral-8 mb-4">无法加载个人资料，请检查网络后重试</p>
                  <Button onClick={fetchProfile} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    重试
                  </Button>
                </div>
              ) : profileData ? (
                <>
                  <h1 className="font-serif text-title-28 font-medium text-neutral-10 mb-8">
                    个人资料
                  </h1>

                  {/* 头像和信息 */}
                  <Card className="mb-8">
                    <CardContent>
                      <div className="flex flex-col items-center gap-6 pt-6 sm:flex-row sm:items-start">
                        <div className="h-24 w-24 shrink-0 rounded-2xl bg-neutral-3 flex items-center justify-center overflow-hidden">
                          {profileData.avatar ? (
                            <img
                              src={profileData.avatar}
                              alt={profileData.username}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-serif text-title-28 text-neutral-6">
                              {getInitials(profileData.username)}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 space-y-2 text-center sm:text-left">
                          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                            <h2 className="font-serif text-title-24 font-medium text-neutral-10">
                              {profileData.username}
                            </h2>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-12 font-medium ${role.className}`}>
                              <Shield className="h-3 w-3" />
                              {role.label}
                            </span>
                          </div>

                          <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-copy-13 text-neutral-7">
                              <Mail className="h-3.5 w-3.5" />
                              {profileData.email}
                            </span>
                            {profileData.createdAt && (
                              <span className="inline-flex items-center gap-1.5 text-copy-13 text-neutral-7">
                                <Calendar className="h-3.5 w-3.5" />
                                加入于 {formatDate(profileData.createdAt)}
                              </span>
                            )}
                          </div>

                          {profileData.bio && (
                            <p className="text-copy-13 text-neutral-7 leading-relaxed max-w-lg">
                              {profileData.bio}
                            </p>
                          )}

                          <div className="pt-2">
                            <Link href="/settings">
                              <Button size="sm">编辑资料</Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 快速统计 */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <Card className="text-center">
                      <CardContent className="py-4">
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle">
                          <FolderGit2 className="h-5 w-5 text-accent" />
                        </div>
                        <div className="font-serif text-title-24 font-medium text-neutral-10">{stats.projects}</div>
                        <p className="text-label-12 text-neutral-7">项目</p>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="py-4">
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                          <CheckSquare className="h-5 w-5 text-success" />
                        </div>
                        <div className="font-serif text-title-24 font-medium text-neutral-10">{stats.tasks}</div>
                        <p className="text-label-12 text-neutral-7">已分配任务</p>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="py-4">
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-info/10">
                          <MessageSquare className="h-5 w-5 text-info" />
                        </div>
                        <div className="font-serif text-title-24 font-medium text-neutral-10">{stats.reviews}</div>
                        <p className="text-label-12 text-neutral-7">代码审查</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 团队信息 */}
                  {teamName && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="font-serif text-copy-16">团队信息</CardTitle>
                        <CardDescription className="text-neutral-7">您当前所属的团队</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 rounded-xl bg-neutral-1 border border-neutral-5 px-5 py-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle">
                            <Users className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-10">{teamName}</p>
                            <p className="text-copy-13 text-neutral-7">{memberCount} 位成员</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
    </TeamGuard>
  );
}
