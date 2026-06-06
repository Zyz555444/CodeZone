'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Users, UserPlus, Mail, Crown, Shield, User } from 'lucide-react';

const teamMembers = [
  {
    id: '1',
    name: '张三',
    email: 'zhangsan@example.com',
    role: 'OWNER',
    avatar: null,
    projects: 5,
    tasks: 12,
  },
  {
    id: '2',
    name: '李四',
    email: 'lisi@example.com',
    role: 'MEMBER',
    avatar: null,
    projects: 3,
    tasks: 8,
  },
  {
    id: '3',
    name: '王五',
    email: 'wangwu@example.com',
    role: 'MEMBER',
    avatar: null,
    projects: 2,
    tasks: 5,
  },
];

const roleConfig = {
  OWNER: { label: '所有者', icon: Crown, color: 'text-accent' },
  ADMIN: { label: '管理员', icon: Shield, color: 'text-info' },
  MANAGER: { label: '经理', icon: Shield, color: 'text-warning' },
  MEMBER: { label: '成员', icon: User, color: 'text-neutral-7' },
  GUEST: { label: '访客', icon: User, color: 'text-neutral-6' },
};

export default function TeamPage() {
  return (
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
                  <h1 className="font-serif text-3xl font-medium text-neutral-10">
                    团队成员
                  </h1>
                  <p className="text-neutral-7 mt-1">
                    管理团队成员和权限
                  </p>
                </div>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  邀请成员
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center">
                      <Users className="h-6 w-6 text-neutral-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-medium text-neutral-10">{teamMembers.length}</p>
                      <p className="text-sm text-neutral-7">团队成员</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center">
                      <Crown className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-medium text-neutral-10">1</p>
                      <p className="text-sm text-neutral-7">所有者</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center">
                      <User className="h-6 w-6 text-neutral-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-medium text-neutral-10">{teamMembers.length - 1}</p>
                      <p className="text-sm text-neutral-7">活跃成员</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Members List */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-lg">所有成员</CardTitle>
                  <CardDescription className="text-neutral-7">
                    团队中的所有成员列表
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-neutral-5">
                    {teamMembers.map((member) => {
                      const role = roleConfig[member.role as keyof typeof roleConfig];
                      const RoleIcon = role.icon;
                      
                      return (
                        <div key={member.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center">
                              <span className="text-lg font-medium text-neutral-7">
                                {member.name[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-neutral-10">{member.name}</p>
                              <div className="flex items-center gap-2 text-sm text-neutral-7">
                                <Mail className="h-3 w-3" />
                                {member.email}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="font-medium text-neutral-10">{member.projects}</p>
                              <p className="text-xs text-neutral-7">项目</p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-neutral-10">{member.tasks}</p>
                              <p className="text-xs text-neutral-7">任务</p>
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-2 ${role.color}`}>
                              <RoleIcon className="h-4 w-4" />
                              <span className="text-sm font-medium">{role.label}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
