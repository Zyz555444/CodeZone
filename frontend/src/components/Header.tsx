'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Moon, Sun, LogOut, User, Menu, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, logout } = useAuthStore();
  const { setTheme, theme } = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    { href: '/dashboard', label: '仪表板' },
    { href: '/projects', label: '项目' },
    { href: '/tasks', label: '任务' },
    { href: '/code', label: '代码' },
    { href: '/reviews', label: '审查' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-5 bg-neutral-1/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="font-serif text-xl font-medium tracking-tight">
            CodeZone
          </Link>
          
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 text-sm rounded-lg transition-colors",
                    pathname === item.href
                      ? "bg-neutral-2 text-neutral-10 font-medium"
                      : "text-neutral-7 hover:text-neutral-9 hover:bg-neutral-2"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
                <span className="sr-only">切换主题</span>
              </Button>

              {/* User Menu */}
              <Link href="/profile">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <User className="h-4 w-4" />
                </Button>
              </Link>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="h-9 w-9 text-neutral-7 hover:text-error"
              >
                <LogOut className="h-4 w-4" />
              </Button>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-neutral-7">
                  登录
                </Button>
              </Link>
              <Link href="/register">
                <Button>注册</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t border-neutral-5 bg-neutral-1 px-4 py-4 animate-slide-up">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "px-3 py-2.5 text-sm rounded-lg transition-colors",
                  pathname === item.href
                    ? "bg-neutral-2 text-neutral-10 font-medium"
                    : "text-neutral-7 hover:text-neutral-9 hover:bg-neutral-2"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
