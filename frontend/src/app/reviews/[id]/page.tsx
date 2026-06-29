'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, MessageSquare, User, FolderGit2, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { TeamGuard } from '@/components/TeamGuard';

interface ReviewAuthor {
  id: string;
  username: string;
  avatar?: string;
}

interface ReviewProject {
  id: string;
  name: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  fileId?: string;
  lineNumber?: number;
}

interface Review {
  id: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'CLOSED' | 'MERGED';
  author: ReviewAuthor;
  project: ReviewProject;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  OPEN: { label: '进行中', bgClass: 'bg-info/20', textClass: 'text-info' },
  CLOSED: { label: '已关闭', bgClass: 'bg-neutral-3', textClass: 'text-neutral-6' },
  MERGED: { label: '已合并', bgClass: 'bg-success/20', textClass: 'text-success' },
};

export default function ReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const user = useAuthStore((s) => s.user);
  const [review, setReview] = useState<Review | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fileId, setFileId] = useState('');
  const [lineNumber, setLineNumber] = useState('');

  const id = params.id as string;

  const fetchReview = useCallback(async () => {
    try {
      const response = await api.get(`/reviews/${id}`);
      setReview(response.data.review);
    } catch (err) {
      console.error('获取审查详情失败:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchComments = useCallback(async () => {
    try {
      const response = await api.get(`/reviews/${id}/comments`);
      setComments(response.data.comments || []);
    } catch (err) {
      console.error('获取评论失败:', err);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchReview();
    fetchComments();
  }, [id, fetchReview, fetchComments]);

  const handleStatusChange = async (newStatus: Review['status']) => {
    try {
      await api.patch(`/reviews/${id}`, { status: newStatus });
      setReview((prev) => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      console.error('更新审查状态失败:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);

    try {
      const payload: Record<string, any> = { content: newComment.trim() };
      if (fileId.trim()) payload.fileId = fileId.trim();
      if (lineNumber.trim()) payload.lineNumber = parseInt(lineNumber.trim(), 10);

      await api.post(`/reviews/${id}/comments`, payload);
      setNewComment('');
      setFileId('');
      setLineNumber('');
      fetchComments();
    } catch (err) {
      console.error('添加评论失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isAuthorOrOwner = user && review && user.id === review.author.id;

  if (loading) {
    return (
      <TeamGuard>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-neutral-1">
              <div className="container py-8 px-6">
                <div className="animate-pulse space-y-6">
                  <div className="h-4 bg-neutral-3 rounded w-24" />
                  <div className="h-8 bg-neutral-3 rounded w-1/2" />
                  <div className="h-4 bg-neutral-3 rounded w-1/3" />
                  <div className="h-32 bg-neutral-3 rounded" />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
      </TeamGuard>
    );
  }

  if (error || !review) {
    return (
      <TeamGuard>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-neutral-1">
              <div className="container py-8 px-6">
                <button
                  onClick={() => router.push('/reviews')}
                  className="flex items-center gap-2 text-neutral-7 hover:text-neutral-9 mb-6 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-copy-13">返回</span>
                </button>
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mb-4">
                    <RefreshCw className="h-8 w-8 text-error" />
                  </div>
                  <h3 className="font-serif text-copy-16 font-medium text-neutral-10 mb-2">
                    加载失败
                  </h3>
                  <p className="text-neutral-7 mb-6">
                    {error ? '无法加载审查详情，请稍后重试' : '审查不存在'}
                  </p>
                  <Button onClick={() => { setError(false); setLoading(true); fetchReview(); }} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重试
                  </Button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
      </TeamGuard>
    );
  }

  const status = statusConfig[review.status];

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-1">
            <div className="container py-8 px-6">
              <button
                onClick={() => router.push('/reviews')}
                className="flex items-center gap-2 text-neutral-7 hover:text-neutral-9 mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-copy-13">返回</span>
              </button>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-serif text-title-24 text-neutral-10">
                          {review.title}
                        </CardTitle>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-copy-13 font-medium ${status.bgClass} ${status.textClass}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-copy-13 text-neutral-7 mt-2">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {review.author.username}
                        </span>
                        <span className="flex items-center gap-1">
                          <FolderGit2 className="h-4 w-4" />
                          {review.project.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                    </CardHeader>
                    {review.description && (
                      <CardContent>
                        <p className="text-neutral-8 leading-relaxed whitespace-pre-wrap">
                          {review.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-serif text-copy-16 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-neutral-6" />
                        评论 ({comments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {comments.length === 0 ? (
                        <p className="text-neutral-7 text-copy-13 py-4 text-center">
                          暂无评论
                        </p>
                      ) : (
                        <div className="space-y-4 mb-6">
                          {comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="w-9 h-9 rounded-lg bg-neutral-2 flex items-center justify-center flex-shrink-0">
                                <span className="text-copy-13 font-medium text-neutral-7">
                                  {comment.user.username[0].toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-copy-13 text-neutral-10">
                                    {comment.user.username}
                                  </span>
                                  <span className="text-label-12 text-neutral-6">
                                    {formatDate(comment.createdAt)}
                                  </span>
                                </div>
                                {(comment.fileId || comment.lineNumber != null) && (
                                  <p className="text-label-12 text-neutral-7 font-mono">
                                    {comment.fileId && `文件: ${comment.fileId}`}
                                    {comment.fileId && comment.lineNumber != null && ' '}
                                    {comment.lineNumber != null && `第 ${comment.lineNumber} 行`}
                                  </p>
                                )}
                                <p className="text-copy-13 text-neutral-8">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center flex-shrink-0">
                            <span className="text-copy-13 font-medium text-accent">
                              {user?.username?.[0]?.toUpperCase() || '你'}
                            </span>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Input
                                  value={fileId}
                                  onChange={(e) => setFileId(e.target.value)}
                                  placeholder="文件路径 (可选)"
                                  className="text-copy-13 h-8 bg-neutral-2"
                                />
                              </div>
                              <div className="w-24">
                                <Input
                                  type="number"
                                  value={lineNumber}
                                  onChange={(e) => setLineNumber(e.target.value)}
                                  placeholder="行号"
                                  className="text-copy-13 h-8 bg-neutral-2"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="添加评论..."
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                                className="bg-neutral-2"
                              />
                              <Button onClick={handleAddComment} disabled={submitting || !newComment.trim()}>
                                评论
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-serif text-copy-16">审查信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4 text-neutral-6" />
                          <span className="text-copy-13 text-neutral-7">作者</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-neutral-2 flex items-center justify-center">
                            <span className="text-label-12 font-medium text-neutral-7">
                              {review.author.username[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="text-copy-13 text-neutral-10">{review.author.username}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FolderGit2 className="h-4 w-4 text-neutral-6" />
                          <span className="text-copy-13 text-neutral-7">项目</span>
                        </div>
                        <span className="text-copy-13 text-neutral-10">{review.project.name}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-neutral-6" />
                          <span className="text-copy-13 text-neutral-7">创建时间</span>
                        </div>
                        <span className="text-copy-13 text-neutral-10">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>

                      {isAuthorOrOwner && review.status !== 'CLOSED' && review.status !== 'MERGED' && (
                        <div className="pt-4 border-t border-neutral-4">
                          <h4 className="text-copy-13 font-medium text-neutral-7 mb-3">操作</h4>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleStatusChange('MERGED')}
                              variant="secondary"
                              className="flex-1 gap-2 hover:bg-success/10 hover:text-success hover:ring-success/30 transition-colors"
                            >
                              <CheckCircle className="h-4 w-4" />
                              通过
                            </Button>
                            <Button
                              onClick={() => handleStatusChange('CLOSED')}
                              variant="secondary"
                              className="flex-1 gap-2 hover:bg-neutral-4 transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                              关闭
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
