'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useWebSocketStore } from '@/stores/websocketStore';
import { Button } from '@/components/ui/Button';
import { GlobalSearch } from '@/components/GlobalSearch';
import { Moon, Sun, LogOut, User, Menu, X, Wifi, WifiOff, Users } from 'lucide-react';
import { useTheme } from 'next-themes';
import { wsService } from '@/lib/websocket';

export const Header = React.memo(function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const teams = useAuthStore((s) => s.teams);
  const isConnected = useWebSocketStore((s) => s.isConnected);
  const onlineCount = useWebSocketStore((s) => s.onlineCount);
  const setConnected = useWebSocketStore((s) => s.setConnected);
  const setOnlineCount = useWebSocketStore((s) => s.setOnlineCount);
  const { setTheme, theme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const teamsRef = React.useRef(teams);
  teamsRef.current = teams;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!user || !mounted || !token) return;

    if (!wsService.socketInstance?.connected) {
      wsService.connect(token);
    }

    const handleConnect = () => {
      setConnected(true);
      setOnlineCount(0);
      if (teamsRef.current.length > 0) {
        wsService.joinTeam(teamsRef.current[0].id);
      }
    };
    const handleDisconnect = () => setConnected(false);
    const handleOnlineUsers = (data: { count: number }) => {
      setOnlineCount(data.count);
    };

    wsService.on('connect', handleConnect);
    wsService.on('disconnect', handleDisconnect);
    wsService.on('online-users', handleOnlineUsers);

    if (wsService.socketInstance?.connected) {
      setConnected(true);
      if (teamsRef.current.length > 0) {
        wsService.joinTeam(teamsRef.current[0].id);
      }
    }

    return () => {
      wsService.off('connect', handleConnect);
      wsService.off('disconnect', handleDisconnect);
      wsService.off('online-users', handleOnlineUsers);
    };
  }, [user, mounted, token, setConnected, setOnlineCount]);

  // 当 teams 加载完成后重新加入团队房间
  React.useEffect(() => {
    if (!wsService.socketInstance?.connected) return;
    if (!teams || teams.length === 0) return;
    wsService.joinTeam(teams[0].id);
  }, [teams]);

  const handleLogout = () => {
    setConnected(false);
    setOnlineCount(0);
    wsService.disconnect();
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-5 bg-neutral-1/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="font-serif text-title-20 font-medium tracking-tight">
            CodeZone
          </Link>
        </div>

        {/* Center: Team Name */}
        <div className="hidden md:flex items-center justify-center flex-1">
          {user && teams.length > 0 && (
            <span className="text-copy-13 font-medium text-neutral-7">
              {teams[0].name}
            </span>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Global Search */}
              <GlobalSearch />

              {/* WebSocket Status */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-2">
                {isConnected ? (
                  <Wifi className="h-3.5 w-3.5 text-success" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-neutral-7" />
                )}
                <span className="text-label-12 text-neutral-7">
                  {isConnected ? '已连接' : '未连接'}
                </span>
                <div className="flex items-center gap-1 ml-1 border-l border-neutral-4 pl-1">
                  <Users className="h-3.5 w-3.5 text-neutral-6" />
                  <span className="text-label-12 text-neutral-7">{onlineCount}</span>
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
});
