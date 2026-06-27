'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Plus, Trash2, Check, Clock, User, MessageSquare, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { TeamGuard } from '@/components/TeamGuard';

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
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
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: any;
  creator: any;
  dueDate?: string;
  createdAt: string;
  subtasks: SubTask[];
  comments: Comment[];
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  TODO: { label: '待办', color: 'text-neutral-7', bgColor: 'bg-neutral-3' },
  IN_PROGRESS: { label: '进行中', color: 'text-info', bgColor: 'bg-info/20' },
  IN_REVIEW: { label: '审查中', color: 'text-warning', bgColor: 'bg-warning/20' },
  DONE: { label: '已完成', color: 'text-success', bgColor: 'bg-success/20' },
  BLOCKED: { label: '已阻塞', color: 'text-error', bgColor: 'bg-error/20' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: '低', color: 'text-neutral-6' },
  MEDIUM: { label: '中', color: 'text-info' },
  HIGH: { label: '高', color: 'text-warning' },
  URGENT: { label: '紧急', color: 'text-error' },
};

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const token = useAuthStore((s) => s.token);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (!token) return;
    fetchTask();
  }, [token, params.id]);

  const fetchTask = async () => {
    try {
      const response = await api.get(`/tasks/${params.id}`);
      setTask(response.data.task);
    } catch (error) {
      console.error('获取任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSubtask = async () => {
    if (!newSubtask.trim() || !task) return;
    try {
      const response = await api.post(
        `/tasks/${task.id}/subtasks`,
        { title: newSubtask.trim() }
      );
      setTask({
        ...task,
        subtasks: [...task.subtasks, response.data.subTask],
      });
      setNewSubtask('');
    } catch (error) {
      console.error('添加子任务失败:', error);
    }
  };

  const toggleSubtask = async (subtaskId: string) => {
    if (!task) return;
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;
    try {
      const response = await api.patch(
        `/tasks/subtasks/${subtaskId}`,
        { completed: !subtask.completed }
      );
      setTask({
        ...task,
        subtasks: task.subtasks.map(st =>
          st.id === subtaskId ? response.data.subTask : st
        ),
      });
    } catch (error) {
      console.error('切换子任务状态失败:', error);
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    if (!task) return;
    try {
      await api.delete(`/tasks/subtasks/${subtaskId}`);
      setTask({
        ...task,
        subtasks: task.subtasks.filter(st => st.id !== subtaskId),
      });
    } catch (error) {
      console.error('删除子任务失败:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !task) return;
    
    try {
      await api.post(
        `/tasks/${task.id}/comments`,
        { content: newComment }
      );
      fetchTask();
      setNewComment('');
    } catch (error) {
      console.error('添加评论失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-1">
        <div className="text-neutral-7">加载中...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-1">
        <div className="text-neutral-7">任务不存在</div>
      </div>
    );
  }

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const progress = task.subtasks.length > 0
    ? Math.round((completedSubtasks / task.subtasks.length) * 100)
    : 0;

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-1">
            <div className="container py-8 px-6">
              {/* Back Button */}
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-neutral-7 hover:text-neutral-9 mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-copy-13">返回</span>
              </button>

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Task Title */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-serif text-title-24 text-neutral-10">{task.title}</CardTitle>
                      <div className="flex items-center gap-4 text-copy-13 text-neutral-7 mt-2">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {task.creator.username} 创建
                        </span>
                        <span className="font-mono">#{task.id.slice(0, 8)}</span>
                        <span>{formatDate(task.createdAt)}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {task.description && (
                        <p className="text-neutral-8 leading-relaxed">{task.description}</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Subtasks */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-serif text-copy-16">子任务</CardTitle>
                        <span className="text-copy-13 text-neutral-7">
                          {completedSubtasks}/{task.subtasks.length} 完成 ({progress}%)
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {task.subtasks.map((subtask) => (
                          <div
                            key={subtask.id}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-2 group transition-colors"
                          >
                            <button
                              onClick={() => toggleSubtask(subtask.id)}
                              className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                subtask.completed
                                  ? 'bg-accent border-accent text-white'
                                  : 'border-neutral-5 hover:border-accent'
                              }`}
                            >
                              {subtask.completed && <Check className="h-3 w-3" />}
                            </button>
                            <span className={`flex-1 ${subtask.completed ? 'line-through text-neutral-6' : 'text-neutral-10'}`}>
                              {subtask.title}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 h-8 w-8 text-neutral-6 hover:text-error"
                              onClick={() => deleteSubtask(subtask.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Input
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          placeholder="添加子任务..."
                          onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                          className="bg-neutral-2"
                        />
                        <Button onClick={addSubtask} size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comments */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-serif text-copy-16 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-neutral-6" />
                        评论 ({task.comments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 mb-6">
                        {task.comments.length === 0 ? (
                          <p className="text-neutral-7 text-copy-13 py-4 text-center">暂无评论</p>
                        ) : (
                          task.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="w-9 h-9 rounded-lg bg-neutral-2 flex items-center justify-center flex-shrink-0">
                                <span className="text-copy-13 font-medium text-neutral-7">
                                  {comment.user.username[0].toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-copy-13 text-neutral-10">{comment.user.username}</span>
                                  <span className="text-label-12 text-neutral-6">
                                    {formatDate(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-copy-13 text-neutral-8">{comment.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center flex-shrink-0">
                          <span className="text-copy-13 font-medium text-accent">你</span>
                        </div>
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="添加评论..."
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && addComment()}
                            className="bg-neutral-2"
                          />
                          <Button onClick={addComment}>评论</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-serif text-copy-16">任务信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-copy-13 font-medium text-neutral-7 mb-2">状态</h4>
                        <span className={`inline-flex text-copy-13 px-3 py-1 rounded-full ${statusConfig[task.status]?.bgColor || 'bg-neutral-3'} ${statusConfig[task.status]?.color || 'text-neutral-7'}`}>
                          {statusConfig[task.status]?.label || task.status}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-copy-13 font-medium text-neutral-7 mb-2">优先级</h4>
                        <span className={`text-copy-13 font-medium ${priorityConfig[task.priority]?.color || 'text-neutral-7'}`}>
                          {priorityConfig[task.priority]?.label || task.priority}
                        </span>
                      </div>
                      {task.assignee && (
                        <div>
                          <h4 className="text-copy-13 font-medium text-neutral-7 mb-2">负责人</h4>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-neutral-2 flex items-center justify-center">
                              <span className="text-label-12 font-medium text-neutral-7">
                                {task.assignee.username[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="text-copy-13 text-neutral-10">{task.assignee.username}</span>
                          </div>
                        </div>
                      )}
                      {task.dueDate && (
                        <div>
                          <h4 className="text-copy-13 font-medium text-neutral-7 mb-2">截止日期</h4>
                          <div className="flex items-center gap-2 text-copy-13 text-neutral-10">
                            <Calendar className="h-4 w-4 text-neutral-6" />
                            <span>{formatDate(task.dueDate)}</span>
                          </div>
                        </div>
                      )}
                      <div>
                        <h4 className="text-copy-13 font-medium text-neutral-7 mb-2">创建时间</h4>
                        <div className="flex items-center gap-2 text-copy-13 text-neutral-10">
                          <Clock className="h-4 w-4 text-neutral-6" />
                          <span>{formatDate(task.createdAt)}</span>
                        </div>
                      </div>
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
