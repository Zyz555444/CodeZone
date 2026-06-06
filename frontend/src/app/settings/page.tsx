'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Bell, User, Lock, Palette, BellOff, Trash2, Check } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'security', label: '安全设置', icon: Lock },
    { id: 'notifications', label: '通知设置', icon: Bell },
    { id: 'appearance', label: '外观设置', icon: Palette },
  ];

  return (
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
                {/* Tabs */}
                <div className="w-48 shrink-0">
                  <nav className="space-y-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                            activeTab === tab.id
                              ? 'bg-neutral-2 text-neutral-10 font-medium'
                              : 'text-neutral-7 hover:text-neutral-9 hover:bg-neutral-2'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Content */}
                <div className="flex-1">
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
                            <label className="text-sm font-medium text-neutral-8">用户名</label>
                            <Input defaultValue="username" className="max-w-md" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-8">邮箱</label>
                            <Input defaultValue="user@example.com" type="email" className="max-w-md" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-8">个人简介</label>
                            <textarea 
                              className="flex min-h-[100px] w-full max-w-md rounded-lg border border-neutral-5 bg-neutral-1 px-3 py-2 text-sm"
                              placeholder="介绍一下自己..."
                            />
                          </div>
                        </div>

                        <Button>保存更改</Button>
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
                            <label className="text-sm font-medium text-neutral-8">当前密码</label>
                            <Input type="password" className="max-w-md" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-8">新密码</label>
                            <Input type="password" className="max-w-md" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-8">确认新密码</label>
                            <Input type="password" className="max-w-md" />
                          </div>
                        </div>
                        <Button>更新密码</Button>
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
                            <Button variant="outline" size="sm" className="gap-2">
                              <Check className="h-3 w-3" />
                              已开启
                            </Button>
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
                          <label className="text-sm font-medium text-neutral-8 mb-3 block">主题</label>
                          <div className="flex gap-3">
                            {['light', 'dark', 'system'].map((theme) => (
                              <button
                                key={theme}
                                className="px-4 py-2 rounded-lg border border-neutral-5 bg-neutral-1 hover:border-accent/30 transition-colors capitalize"
                              >
                                {theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-neutral-8 mb-3 block">编辑器字体大小</label>
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
  );
}
