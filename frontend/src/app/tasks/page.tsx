'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Search, Filter, Calendar, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { TeamGuard } from '@/components/TeamGuard';

interface Task {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignee?: { id: string; username: string; avatar?: string };
  creator: { id: string; username: string };
  dueDate?: string;
  createdAt: string;
  _count?: { comments: number; subtasks: number };
}

const statusConfig = {
  TODO: { label: '待办', color: 'bg-neutral-3 text-neutral-8' },
  IN_PROGRESS: { label: '进行中', color: 'bg-info/20 text-info' },
  IN_REVIEW: { label: '审查中', color: 'bg-warning/20 text-warning' },
  DONE: { label: '已完成', color: 'bg-success/20 text-success' },
  BLOCKED: { label: '已阻塞', color: 'bg-error/20 text-error' },
};

const priorityConfig = {
  LOW: { label: '低', color: 'text-neutral-6' },
  MEDIUM: { label: '中', color: 'text-info' },
  HIGH: { label: '高', color: 'text-warning' },
  URGENT: { label: '紧急', color: 'text-error' },
};

function TasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const projectId = searchParams.get('projectId');

  useEffect(() => {
    if (!token) return;
    fetchTasks();
  }, [projectId, token, statusFilter]);

  const fetchTasks = async () => {
    try {
      const response = await api.get(
        `/tasks${projectId ? `?projectId=${projectId}` : ''}`
      );
      let filteredTasks = response.data.tasks || [];
      
      if (statusFilter !== 'all') {
        filteredTasks = filteredTasks.filter((t: Task) => t.status === statusFilter);
      }
      
      if (searchQuery) {
        filteredTasks = filteredTasks.filter((t: Task) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setTasks(filteredTasks);
    } catch (error) {
      console.error('获取任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('更新任务状态失败:', error);
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tasksByStatus = {
    TODO: filteredTasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: filteredTasks.filter(t => t.status === 'IN_PROGRESS'),
    IN_REVIEW: filteredTasks.filter(t => t.status === 'IN_REVIEW'),
    DONE: filteredTasks.filter(t => t.status === 'DONE'),
  };

  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      return;
    }
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        handleStatusChange(taskId, newStatus as Task['status']);
      }
    }
  };

  const renderTaskCard = (task: Task) => (
    <Card
      key={task.id}
      draggable
      className={`cursor-pointer hover:shadow-float transition-all duration-200 ${draggedTaskId === task.id ? 'opacity-50' : ''}`}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        setDraggedTaskId(task.id);
      }}
      onDragEnd={() => {
        setDraggedTaskId(null);
      }}
      onClick={() => router.push(`/tasks/${task.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-medium line-clamp-2 text-neutral-10">{task.title}</h3>
          <div className="flex items-center gap-1">
            <span className={`text-xs ${priorityConfig[task.priority].color}`}>
              ●
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-7">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{task.assignee.username}</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(task.dueDate)}</span>
            </div>
          )}
        </div>

        {task._count && task._count.comments > 0 && (
          <div className="flex items-center gap-3 text-xs text-neutral-6">
            <span>{task._count.comments} 评论</span>
            <span>{task._count.subtasks} 子任务</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-neutral-4">
          <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[task.status].color}`}>
            {statusConfig[task.status].label}
          </span>
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
            onClick={(e) => e.stopPropagation()}
            className="text-xs border border-neutral-5 rounded px-2 py-1 bg-neutral-2 text-neutral-9"
          >
            {Object.entries(statusConfig).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );

  const renderColumn = (title: string, status: string, taskList: Task[]) => (
    <div className={`flex-1 min-w-72 rounded-lg transition-colors duration-200 ${dragOverColumn === status ? 'border-2 border-accent' : 'border-2 border-transparent'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-neutral-10">{title}</h3>
          <span className="text-xs text-neutral-7 bg-neutral-3 px-2 py-0.5 rounded-full">
            {taskList.length}
          </span>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div
        className="space-y-3 min-h-[100px]"
        onDragOver={(e) => handleDragOver(e, status)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, status)}
      >
        {taskList.map(renderTaskCard)}
        {taskList.length === 0 && (
          <div className="text-center py-8 text-sm text-neutral-7 border-2 border-dashed border-neutral-5 rounded-lg">
            暂无任务
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-x-auto overflow-y-auto bg-neutral-1">
            <div className="container py-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="font-serif text-3xl font-medium text-neutral-10">任务</h1>
                  <p className="text-neutral-7">管理和跟踪项目任务</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-6" />
                    <input
                      type="text"
                      placeholder="搜索任务..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-neutral-5 rounded-lg bg-neutral-2 text-neutral-9 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    筛选
                  </Button>
                  <Button onClick={() => router.push(`/tasks/new?projectId=${projectId || ''}`)}>
                    <Plus className="mr-2 h-4 w-4" />
                    新建任务
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-neutral-7">加载中...</div>
                </div>
              ) : (
                <div className="flex gap-4 min-w-max">
                  {renderColumn('待办', 'TODO', tasksByStatus.TODO)}
                  {renderColumn('进行中', 'IN_PROGRESS', tasksByStatus.IN_PROGRESS)}
                  {renderColumn('审查中', 'IN_REVIEW', tasksByStatus.IN_REVIEW)}
                  {renderColumn('已完成', 'DONE', tasksByStatus.DONE)}
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

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-neutral-1">
        <div className="text-neutral-7">加载中...</div>
      </div>
    }>
      <TasksContent />
    </Suspense>
  );
}
