import { apiUrl } from './env';
import { authFetch } from './utils';

export type AIErrorType = 'auth' | 'rate_limit' | 'server' | 'timeout' | 'network' | 'abort' | 'unknown';

export interface AIError {
  type: AIErrorType;
  retryable: boolean;
  message: string;
  suggestion?: string;
}

function classifyHttpError(statusCode: number, body?: { error?: string; message?: string }): AIError {
  const msg = body?.error || body?.message || `请求失败 (${statusCode})`;

  if (statusCode === 401 || statusCode === 403) {
    return { type: 'auth', retryable: false, message: msg, suggestion: '请检查 API Key 或团队 AI 设置' };
  }
  if (statusCode === 429) {
    return { type: 'rate_limit', retryable: true, message: msg, suggestion: '请求过于频繁，请稍后重试' };
  }
  if (statusCode >= 500) {
    return { type: 'server', retryable: true, message: msg, suggestion: '服务器错误，请稍后重试' };
  }
  return { type: 'unknown', retryable: false, message: msg };
}

function classifyNetworkError(err: Error): AIError {
  const name = err.name || '';
  const msg = err.message || '';

  if (name === 'AbortError') {
    return { type: 'abort', retryable: false, message: '操作已取消' };
  }
  if (name === 'TimeoutError' || msg.includes('timeout') || msg.includes('超时')) {
    return { type: 'timeout', retryable: true, message: '请求超时', suggestion: '请检查网络连接后重试' };
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch') || msg.includes('连接')) {
    return { type: 'network', retryable: false, message: '网络错误，请检查连接' };
  }
  return { type: 'unknown', retryable: false, message: msg || '未知错误' };
}

export function formatAIError(err: AIError): string {
  if (err.suggestion) return `${err.message}。${err.suggestion}`;
  return err.message;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (conversationId?: string) => void;
  onError: (error: AIError) => void;
}

interface AgentCallbacks {
  onToken: (token: string) => void;
  onThinking: (content: string) => void;
  onToolCall: (toolId: string, toolName: string, toolArgs: Record<string, unknown>) => void;
  onToolResult: (toolId: string, toolName: string, result: string) => void;
  onWriteFile: (filePath: string, content: string, patch?: { old: string; new: string }) => void;
  onConfirmRequest?: (toolId: string, toolName: string, toolArgs: Record<string, unknown>, conversationId?: string) => void;
  onDone: (conversationId?: string, totalTokens?: number) => void;
  onError: (error: AIError) => void;
}

interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

async function parseSSEStream<T extends SSEEvent>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const trimmed = event.trim();
        if (!trimmed) continue;

        const lines = trimmed.split('\n');
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            dataLines.push(line.slice(6));
          }
        }
        if (dataLines.length === 0) continue;

        const combinedData = dataLines.join('\n');

        try {
          const data = JSON.parse(combinedData);
          onEvent(data as T);
        } catch {
          continue;
        }
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') return;
    throw e;
  }
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
    const errBody = await response.json().catch(() => ({}));
    callbacks.onError(classifyHttpError(response.status, errBody));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError({ type: 'unknown', retryable: false, message: '无法读取响应流' });
    return;
  }

  try {
    await parseSSEStream(reader, (data: SSEEvent) => {
      if (data.type === 'token') {
        callbacks.onToken((data.content as string) || '');
      } else if (data.type === 'done') {
        callbacks.onDone(data.conversationId as string | undefined);
      } else if (data.type === 'error') {
        callbacks.onError(classifyHttpError(500, { message: (data.message as string) || 'AI 服务错误' }));
      }
    }, abortSignal);
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      callbacks.onError({ type: 'abort', retryable: false, message: '操作已取消' });
    } else {
      callbacks.onError(classifyNetworkError(e instanceof Error ? e : new Error('连接中断')));
    }
  }
}

export async function agentExecute(
  body: {
    task: string;
    projectId: string;
    conversationId?: string;
    contextFiles?: string[];
    model?: string;
    teamId?: string;
  },
  callbacks: AgentCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
   const controller = new AbortController();
   if (abortSignal) {
     if (abortSignal.aborted) {
       controller.abort();
     } else {
       abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
     }
   }
   const signal = controller.signal;

  const response = await authFetch(apiUrl('/api/ai/agent'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    callbacks.onError(classifyHttpError(response.status, errBody));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError({ type: 'unknown', retryable: false, message: '无法读取响应流' });
    return;
  }

  try {
    await parseSSEStream(reader, (data: SSEEvent) => {
      switch (data.type) {
        case 'token':
          callbacks.onToken((data.content as string) || '');
          break;
        case 'thinking':
          callbacks.onThinking((data.content as string) || '');
          break;
        case 'tool_call':
          callbacks.onToolCall(
            data.toolId as string,
            data.toolName as string,
            (data.toolArgs as Record<string, unknown>) || {},
          );
          break;
        case 'tool_result':
          callbacks.onToolResult(
            data.toolId as string,
            data.toolName as string,
            (data.toolResult as string) || '',
          );
          break;
        case 'write_file':
          callbacks.onWriteFile(
            (data.filePath as string) || '',
            (data.content as string) || '',
            data.patch as { old: string; new: string } | undefined,
          );
          break;
        case 'confirm_request':
          callbacks.onConfirmRequest?.(
            data.toolId as string,
            data.toolName as string,
            (data.toolArgs as Record<string, unknown>) || {},
            data.conversationId as string | undefined,
          );
          break;
        case 'done':
          callbacks.onDone(
            data.conversationId as string | undefined,
            data.totalTokens as number | undefined,
          );
          return;
        case 'error': {
          callbacks.onError(classifyHttpError(500, { message: (data.message as string) || 'Agent 执行失败' }));
          return;
        }
      }
    }, abortSignal);
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      callbacks.onError({ type: 'abort', retryable: false, message: '操作已取消' });
    } else {
      callbacks.onError(classifyNetworkError(e instanceof Error ? e : new Error('连接中断')));
    }
  }
}

export async function abortAgentExecute(conversationId: string): Promise<void> {
  await authFetch(apiUrl('/api/ai/agent/abort'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId }),
  });
}

export async function confirmAgentTool(conversationId: string, toolId: string, confirmed: boolean): Promise<void> {
  const res = await authFetch(apiUrl('/api/ai/agent/confirm'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, toolId, confirmed }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '确认失败' }));
    throw new Error(err.error || '确认失败');
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
