'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, MessageSquare, FolderGit2, User, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { TeamGuard } from '@/components/TeamGuard';

interface Review {
  id: string;
  title: string;
  status: 'OPEN' | 'CLOSED' | 'MERGED';
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  project: {
    id: string;
    name: string;
  };
  createdAt: string;
  _count?: {
    comments: number;
  };
}

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  OPEN: { label: '进行中', bgClass: 'bg-info/20', textClass: 'text-info' },
  CLOSED: { label: '已关闭', bgClass: 'bg-neutral-3', textClass: 'text-neutral-6' },
  MERGED: { label: '已合并', bgClass: 'bg-success/20', textClass: 'text-success' },
};

export default function ReviewsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchReviews();
  }, [isAuthenticated, router, token]);

  const fetchReviews = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get('/reviews');
      setReviews(response.data.reviews || []);
    } catch (err) {
      console.error('获取审查列表失败:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-1">
            <div className="container mx-auto max-w-6xl px-6 py-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="font-serif text-title-28 font-medium text-neutral-10">
                    代码审查
                  </h1>
                  <p className="text-neutral-7 mt-1">
                    管理和跟踪代码审查
                  </p>
                </div>
                <Link href="/reviews/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    创建审查
                  </Button>
                </Link>
              </div>

              {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-5 space-y-4">
                        <div className="h-4 bg-neutral-3 rounded w-3/4" />
                        <div className="h-3 bg-neutral-3 rounded w-1/2" />
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-16 bg-neutral-3 rounded-full" />
                          <div className="h-4 w-20 bg-neutral-3 rounded" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mb-4">
                    <RefreshCw className="h-8 w-8 text-error" />
                  </div>
                  <h3 className="font-serif text-copy-16 font-medium text-neutral-10 mb-2">
                    加载失败
                  </h3>
                  <p className="text-neutral-7 mb-6">
                    无法获取审查列表，请稍后重试
                  </p>
                  <Button onClick={fetchReviews} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重试
                  </Button>
                </div>
              ) : reviews.length === 0 ? (
                <Card className="max-w-md mx-auto">
                  <CardContent className="py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-2 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-neutral-7" />
                    </div>
                    <h3 className="font-serif text-copy-16 font-medium text-neutral-10 mb-2">
                      暂无代码审查
                    </h3>
                    <p className="text-neutral-7 mb-6">
                      创建代码审查来协作检查和改进代码
                    </p>
                    <Link href="/reviews/new">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        创建审查
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reviews.map((review) => (
                    <Card
                      key={review.id}
                      className="group hover:shadow-float hover:border-accent/30 transition-all duration-300 cursor-pointer"
                      onClick={() => router.push(`/reviews/${review.id}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-neutral-2 flex items-center justify-center group-hover:bg-accent-subtle transition-colors">
                            <MessageSquare className="h-6 w-6 text-neutral-6 group-hover:text-accent transition-colors" />
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-12 font-medium ${statusConfig[review.status]?.bgClass} ${statusConfig[review.status]?.textClass}`}>
                            {statusConfig[review.status]?.label}
                          </span>
                        </div>

                        <h3 className="font-medium text-neutral-10 mb-1 group-hover:text-accent transition-colors">
                          {review.title}
                        </h3>

                        <div className="flex items-center gap-4 text-label-12 text-neutral-6 mt-3">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {review.author.username}
                          </span>
                          <span className="flex items-center gap-1">
                            <FolderGit2 className="h-3 w-3" />
                            {review.project.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-4">
                          <span className="text-label-12 text-neutral-6">
                            {review._count?.comments ?? 0} 条评论
                          </span>
                          <span className="text-label-12 text-neutral-7">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
    </TeamGuard>
  );
}
