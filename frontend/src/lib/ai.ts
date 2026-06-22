import { apiUrl } from './env';
import { authFetch } from './utils';

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (conversationId?: string) => void;
  onError: (error: string) => void;
}

export async function streamChat(
  body: {
    conversationId?: string;
    projectId: string;
    messages: Array<{ role: string; content: string }>;
    contextFiles?: string[];
    model?: string;
    teamId?: string;
  },
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  const response = await authFetch(apiUrl('/api/ai/chat/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: '请求失败' }));
    callbacks.onError(err.error || `请求失败 (${response.status})`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError('无法读取响应流');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6);
        try {
          const data = JSON.parse(jsonStr);
          if (data.type === 'token') {
            callbacks.onToken(data.content || '');
          } else if (data.type === 'done') {
            callbacks.onDone(data.conversationId);
            return;
          } else if (data.type === 'error') {
            callbacks.onError(data.message || 'AI 服务错误');
            return;
          }
        } catch {
          // skip unparseable lines
        }
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.name !== 'AbortError') {
      callbacks.onError(e.message || '连接中断');
    }
  }
}

export async function getAISettings(teamId: string) {
  const res = await authFetch(apiUrl(`/api/ai/settings/${teamId}`));
  if (!res.ok) throw new Error('获取 AI 设置失败');
  return res.json();
}

export async function updateAISettings(teamId: string, data: Record<string, unknown>) {
  const res = await authFetch(apiUrl(`/api/ai/settings/${teamId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '保存失败' }));
    throw new Error(err.error || '保存失败');
  }
  return res.json();
}

export async function validateAISettings(teamId: string, data: Record<string, unknown>) {
  const res = await authFetch(apiUrl(`/api/ai/settings/${teamId}/validate`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getModels(teamId?: string) {
  const path = teamId ? `/api/ai/models/${teamId}` : '/api/ai/models';
  const res = await authFetch(apiUrl(path));
  if (!res.ok) throw new Error('获取模型列表失败');
  return res.json();
}

export async function listConversations(projectId: string) {
  const res = await authFetch(apiUrl(`/api/ai/conversations?projectId=${projectId}`));
  if (!res.ok) throw new Error('获取对话列表失败');
  return res.json();
}

export async function createConversation(projectId: string, title?: string, modelId?: string) {
  const res = await authFetch(apiUrl('/api/ai/conversations'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, title, modelId }),
  });
  if (!res.ok) throw new Error('创建对话失败');
  return res.json();
}

export async function getConversation(id: string) {
  const res = await authFetch(apiUrl(`/api/ai/conversations/${id}`));
  if (!res.ok) throw new Error('获取对话失败');
  return res.json();
}

export async function deleteConversation(id: string) {
  const res = await authFetch(apiUrl(`/api/ai/conversations/${id}`), { method: 'DELETE' });
  if (!res.ok) throw new Error('删除对话失败');
  return res.json();
}

export async function updateConversationTitle(id: string, title: string) {
  const res = await authFetch(apiUrl(`/api/ai/conversations/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('更新对话失败');
  return res.json();
}
