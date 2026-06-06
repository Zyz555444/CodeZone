'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  FolderGit2, 
  CheckSquare, 
  MessageSquare, 
  Settings,
  Code2,
  Users,
  Activity,
  Bell
} from 'lucide-react';

const menuItems = [
  {
    title: '概览',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: '项目',
    href: '/projects',
    icon: FolderGit2,
  },
  {
    title: '任务',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    title: '代码',
    href: '/code',
    icon: Code2,
  },
  {
    title: '审查',
    href: '/reviews',
    icon: MessageSquare,
  },
  {
    title: '团队',
    href: '/team',
    icon: Users,
  },
  {
    title: '活动',
    href: '/activity',
    icon: Activity,
  },
  {
    title: '通知',
    href: '/notifications',
    icon: Bell,
  },
  {
    title: '设置',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-neutral-5 bg-neutral-1 md:block w-56 shrink-0" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="flex h-full flex-col px-3 py-4">
        <nav className="flex-1 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                  isActive
                    ? 'bg-neutral-2 text-neutral-10 font-medium'
                    : 'text-neutral-7 hover:text-neutral-9 hover:bg-neutral-2'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-neutral-5 pt-4 mt-4">
          <div className="rounded-xl bg-neutral-2 p-4">
            <h4 className="font-serif text-sm font-medium text-neutral-10 mb-2">
              升级到 Pro
            </h4>
            <p className="text-xs text-neutral-7 mb-3">
              解锁更多功能和无限制使用
            </p>
            <Link
              href="/pricing"
              className="block text-center text-xs text-accent hover:underline"
            >
              查看方案 →
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
