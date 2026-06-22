'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Bell, User, Lock, Palette, Check, Save, Sparkles } from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';
import { api } from '@/lib/api';
import { useTheme } from 'next-themes';
import Link from 'next/link';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({ username: '', email: '', bio: '' });
  const [passwordData, setPasswordData] = useState({ current: '', newPw: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      if (data.user) {
        setProfileData({
          username: data.user.username || '',
          email: data.user.email || '',
          bio: data.user.bio || '',
        });
      }
    }).catch((err) => {
      console.error('获取用户资料失败:', err);
    });
  }, []);

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      await api.patch('/users/profile', {
        username: profileData.username,
        bio: profileData.bio,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwordData.newPw !== passwordData.confirm) {
      setError('两次输入的新密码不一致');
      return;
    }
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      await api.patch('/users/password', {
        currentPassword: passwordData.current,
        newPassword: passwordData.newPw,
      });
      setPasswordData({ current: '', newPw: '', confirm: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || '密码更新失败');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'security', label: '安全设置', icon: Lock },
    { id: 'notifications', label: '通知设置', icon: Bell },
    { id: 'appearance', label: '外观设置', icon: Palette },
    { id: 'ai', label: 'AI 设置', icon: Sparkles, href: '/settings/ai' },
  ];

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-1">
            <div className="container mx-auto max-w-4xl px-6 py-8">
              <h1 className="font-serif text-3xl font-medium text-neutral-10 mb-8">
                设置
              </h1>

              <div className="flex gap-8">
                <div className="w-48 shrink-0">
                  <nav className="space-y-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const className = `w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-neutral-2 text-neutral-10 font-medium'
                          : 'text-neutral-7 hover:text-neutral-9 hover:bg-neutral-2'
                      }`;
                      if ('href' in tab && tab.href) {
                        return (
                          <Link key={tab.id} href={tab.href} className={className}>
                            <Icon className="h-4 w-4" />
                            {tab.label}
                          </Link>
                        );
                      }
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={className}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="flex-1">
                  {error && (
                    <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error">
                      {error}
                    </div>
                  )}
                  {saved && (
                    <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg text-sm text-success flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      保存成功
                    </div>
                  )}

                  {activeTab === 'profile' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="font-serif text-xl">个人资料</CardTitle>
                        <CardDescription className="text-neutral-7">
                          管理您的个人信息和公开资料
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-neutral-3 flex items-center justify-center">
                            <User className="h-8 w-8 text-neutral-6" />
                          </div>
                          <div>
                            <Button variant="outline" size="sm">更换头像</Button>
                            <p className="text-xs text-neutral-6 mt-2">支持 JPG、PNG 格式，最大 2MB</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-9">用户名</label>
                            <Input value={profileData.username} onChange={(e) => setProfileData({ ...profileData, username: e.target.value })} className="max-w-md" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-9">邮箱</label>
                            <Input value={profileData.email} type="email" className="max-w-md" disabled />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-9">个人简介</label>
                            <textarea
                              className="flex min-h-[100px] w-full max-w-md rounded-lg border border-neutral-5 bg-neutral-1 px-3 py-2 text-sm text-neutral-9 placeholder:text-neutral-6 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                              value={profileData.bio}
                              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                              placeholder="介绍一下自己..."
                            />
                          </div>
                        </div>

                        <Button onClick={handleSaveProfile} disabled={loading} className="gap-2">
                          <Save className="h-4 w-4" />
                          {loading ? '保存中...' : '保存更改'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'security' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="font-serif text-xl">安全设置</CardTitle>
                        <CardDescription className="text-neutral-7">
                          管理您的账户安全和登录方式
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-9">当前密码</label>
                            <Input type="password" className="max-w-md" value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-9">新密码</label>
                            <Input type="password" className="max-w-md" value={passwordData.newPw} onChange={(e) => setPasswordData({ ...passwordData, newPw: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-9">确认新密码</label>
                            <Input type="password" className="max-w-md" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} />
                          </div>
                        </div>
                        <Button onClick={handleUpdatePassword} disabled={loading || !passwordData.current || !passwordData.newPw} className="gap-2">
                          <Save className="h-4 w-4" />
                          {loading ? '更新中...' : '更新密码'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'notifications' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="font-serif text-xl">通知设置</CardTitle>
                        <CardDescription className="text-neutral-7">
                          控制您接收的通知类型和方式
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { label: '任务提醒', description: '当有任务分配给您或任务状态变更时' },
                          { label: '项目动态', description: '项目有新成员或重要更新时' },
                          { label: '代码审查', description: '当您的代码有待审查或审查完成时' },
                          { label: '系统通知', description: '系统公告和重要通知' },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between py-3 border-b border-neutral-5 last:border-0">
                            <div>
                              <p className="font-medium text-neutral-10">{item.label}</p>
                              <p className="text-sm text-neutral-7">{item.description}</p>
                            </div>
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-2 text-sm text-neutral-7">
                              <Check className="h-3 w-3" />
                              已开启
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'appearance' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="font-serif text-xl">外观设置</CardTitle>
                        <CardDescription className="text-neutral-7">
                          自定义界面的外观和显示效果
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <label className="text-sm font-medium text-neutral-9 mb-3 block">主题</label>
                          <div className="flex gap-3">
                            {(['light', 'dark', 'system'] as const).map((themeOption) => (
                              <button
                                key={themeOption}
                                onClick={() => setTheme(themeOption)}
                                className={`px-4 py-2 rounded-lg border transition-colors capitalize ${
                                  theme === themeOption
                                    ? 'border-accent bg-accent-subtle text-accent'
                                    : 'border-neutral-5 bg-neutral-1 hover:border-accent/30 text-neutral-7'
                                }`}
                              >
                                {themeOption === 'light' ? '浅色' : themeOption === 'dark' ? '深色' : '跟随系统'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-neutral-9 mb-3 block">编辑器字体大小</label>
                          <Input type="range" min="12" max="20" defaultValue="14" className="max-w-md" />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
    </TeamGuard>
  );
}
