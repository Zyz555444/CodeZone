'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useWebSocketStore } from '@/stores/websocketStore';
import { Button } from '@/components/ui/Button';
import { Moon, Sun, LogOut, User, Menu, X, Wifi, WifiOff, Users } from 'lucide-react';
import { useTheme } from 'next-themes';
import { wsService } from '@/lib/websocket';

export function Header() {
  const { user, token, logout, teams } = useAuthStore();
  const { isConnected, onlineCount, setConnected, setOnlineCount } = useWebSocketStore();
  const { setTheme, theme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!user || !mounted || !token) return;

    // 先建立连接（确保 this.socket 非 null，后续 on() 才能注册成功）
    if (!wsService.socketInstance?.connected) {
      wsService.connect(token);
    }

    const handleConnect = () => {
      setConnected(true);
      setOnlineCount(0);
      if (teams.length > 0) {
        wsService.joinTeam(teams[0].id);
      }
    };
    const handleDisconnect = () => setConnected(false);
    const handleOnlineUsers = (data: { count: number }) => {
      setOnlineCount(data.count);
    };

    // 现在注册监听器（this.socket 已在 connect 中创建）
    wsService.on('connect', handleConnect);
    wsService.on('disconnect', handleDisconnect);
    wsService.on('online-users', handleOnlineUsers);

    // 如果已经连接成功（复用已有连接），手动更新状态
    if (wsService.socketInstance?.connected) {
      setConnected(true);
      if (teams.length > 0) {
        wsService.joinTeam(teams[0].id);
      }
    }

    return () => {
      wsService.off('connect', handleConnect);
      wsService.off('disconnect', handleDisconnect);
      wsService.off('online-users', handleOnlineUsers);
    };
  }, [user, mounted, token, teams, setConnected, setOnlineCount]);

  const handleLogout = () => {
    wsService.disconnect();
    logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-5 bg-neutral-1/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="font-serif text-xl font-medium tracking-tight">
            CodeZone
          </Link>
        </div>

        {/* Center: Team Name */}
        <div className="hidden md:flex items-center justify-center flex-1">
          {user && teams.length > 0 && (
            <span className="text-sm font-medium text-neutral-7">
              {teams[0].name}
            </span>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* WebSocket Status */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-2">
                {isConnected ? (
                  <Wifi className="h-3.5 w-3.5 text-green-6" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-neutral-5" />
                )}
                <span className="text-xs text-neutral-7">
                  {isConnected ? '已连接' : '未连接'}
                </span>
                <div className="flex items-center gap-1 ml-1 border-l border-neutral-4 pl-1">
                  <Users className="h-3.5 w-3.5 text-neutral-6" />
                  <span className="text-xs text-neutral-7">{onlineCount}</span>
                </div>
              </div>

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
    </header>
  );
}
