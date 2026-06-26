import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import {
  aiCodeCompletion,
  aiExplainCode,
  aiGenerateCode,
  aiReviewCode,
  aiImproveCode,
  aiChat,
  aiStreamChat,
} from '../lib/ai/service';
import { collectProjectContext, buildContextSystemPrompt } from '../lib/ai/context';
import { executeAgentTask, generateConversationTitle } from '../lib/ai/agent';
import { getTeamConfig } from '../lib/ai/teamConfigHelper';
import { writeSSEEvent, setupSSEConnection, createAbortController } from '../lib/ai/sse';
import type { Message } from '../lib/ai/types';

const MAX_CODE_LENGTH = 50000;
const MAX_MESSAGE_LENGTH = 2000;

const activeAgentAborts = new Map<string, AbortController>();

function registerAgentAbort(conversationId: string, controller: AbortController): void {
  const existing = activeAgentAborts.get(conversationId);
  if (existing) {
    existing.abort();
  }
  activeAgentAborts.set(conversationId, controller);
}

function unregisterAgentAbort(conversationId: string): void {
  activeAgentAborts.delete(conversationId);
}

export { getTeamConfig } from '../lib/ai/teamConfigHelper';

function classifyError(error: unknown): {
  type: 'auth' | 'rate_limit' | 'server' | 'timeout' | 'network' | 'unknown';
  retryable: boolean;
  message: string;
} {
  const msg = error instanceof Error ? error.message : String(error);

  if (/429/.test(msg)) {
    return { type: 'rate_limit', retryable: true, message: 'AI 请求过于频繁，请稍后再试' };
  }
  if (msg.includes('401') || msg.includes('403')) {
    return { type: 'auth', retryable: false, message: 'AI 服务认证失败，请检查 API Key 配置' };
  }
  if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || (error instanceof Error && error.name === 'AbortError')) {
    return { type: 'timeout', retryable: true, message: 'AI 请求超时，请重试' };
  }
  if (/5\d\d/.test(msg)) {
    return { type: 'server', retryable: true, message: 'AI 服务器错误，请稍后重试' };
  }
  if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('ECONNRESET')) {
    return { type: 'network', retryable: false, message: '网络连接失败，请检查网络' };
  }

  logger.error('AI error:', msg);
  return { type: 'unknown', retryable: false, message: 'AI 服务暂时不可用，请稍后重试' };
}

function safeError(error: unknown): string {
  return classifyError(error).message;
}

export async function codeCompletion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { prefix, suffix, language, teamId } = req.body;
    if (!prefix && !suffix) {
      res.status(400).json({ error: 'prefix or suffix is required' });
      return;
    }
    if ((prefix?.length || 0) > MAX_CODE_LENGTH || (suffix?.length || 0) > MAX_CODE_LENGTH) {
      res.status(400).json({ error: '代码长度超出限制' });
      return;
    }
    const teamConfig = await getTeamConfig(teamId);
    const completion = await aiCodeCompletion(prefix || '', suffix || '', language || 'typescript', teamConfig);
    res.json({ completion });
  } catch (error: unknown) {
    logger.error('AI completion error:', error);
    const classified = classifyError(error);
    res.status(classified.type === 'rate_limit' ? 429 : 500).json({ error: classified.message, type: classified.type, retryable: classified.retryable });
  }
}

export async function explainCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { code, language, teamId } = req.body;
    if (!code) {
      res.status(400).json({ error: 'code is required' });
      return;
    }
    if (code.length > MAX_CODE_LENGTH) {
      res.status(400).json({ error: '代码长度超出限制' });
      return;
    }
    const teamConfig = await getTeamConfig(teamId);
    const explanation = await aiExplainCode(code, language || 'typescript', teamConfig);
    res.json({ explanation });
  } catch (error: unknown) {
    logger.error('AI explanation error:', error);
    res.status(500).json({ error: safeError(error) });
  }
}

export async function generateCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { description, language, context, teamId } = req.body;
    if (!description) {
      res.status(400).json({ error: 'description is required' });
      return;
    }
    if (description.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ error: '描述长度超出限制' });
      return;
    }
    if (context && context.length > MAX_CODE_LENGTH) {
      res.status(400).json({ error: '上下文代码长度超出限制' });
      return;
    }
    const teamConfig = await getTeamConfig(teamId);
    const code = await aiGenerateCode(description, language || 'typescript', context, teamConfig);
    res.json({ code });
  } catch (error: unknown) {
    logger.error('AI generation error:', error);
    res.status(500).json({ error: safeError(error) });
  }
}

export async function reviewCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { code, language, teamId } = req.body;
    if (!code) {
      res.status(400).json({ error: 'code is required' });
      return;
    }
    if (code.length > MAX_CODE_LENGTH) {
      res.status(400).json({ error: '代码长度超出限制' });
      return;
    }
    const teamConfig = await getTeamConfig(teamId);
    const review = await aiReviewCode(code, language || 'typescript', teamConfig);
    res.json({ review });
  } catch (error: unknown) {
    logger.error('AI review error:', error);
    res.status(500).json({ error: safeError(error) });
  }
}

export async function improveCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { code, language, instruction, teamId } = req.body;
    if (!code || !instruction) {
      res.status(400).json({ error: 'code and instruction are required' });
      return;
    }
    if (code.length > MAX_CODE_LENGTH) {
      res.status(400).json({ error: '代码长度超出限制' });
      return;
    }
    if (instruction.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ error: '指令长度超出限制' });
      return;
    }
    const teamConfig = await getTeamConfig(teamId);
    const improvedCode = await aiImproveCode(code, language || 'typescript', instruction, teamConfig);
    res.json({ code: improvedCode });
  } catch (error: unknown) {
    logger.error('AI improvement error:', error);
    res.status(500).json({ error: safeError(error) });
  }
}

export async function chatWithAI(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { messages, teamId } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }
    if (messages.length > 20) {
      res.status(400).json({ error: '消息数量超出限制' });
      return;
    }
    const teamConfig = await getTeamConfig(teamId);
    const reply = await aiChat(messages, { temperature: 0.5, maxTokens: 2048 }, teamConfig);
    res.json({ reply });
  } catch (error: unknown) {
    logger.error('AI chat error:', error);
    res.status(500).json({ error: safeError(error) });
  }
}

export async function streamChat(req: AuthRequest, res: Response): Promise<void> {
  const { conversationId, projectId, messages, contextFiles, teamId } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  setupSSEConnection(res);
  const abortController = createAbortController(req);
  const convId = conversationId as string | undefined;

  try {
    const teamConfig = await getTeamConfig(teamId);

    let systemPrompt = '';
    if (projectId) {
      const context = await collectProjectContext(projectId, undefined, contextFiles);
      systemPrompt = buildContextSystemPrompt(context);
    }

    const fullMessages: Message[] = [];
    if (systemPrompt) {
      fullMessages.push({ role: 'system', content: systemPrompt });
    }
    fullMessages.push(...(messages as Message[]));

    const stream = aiStreamChat(fullMessages, { temperature: 0.5, maxTokens: 4096 }, teamConfig);

    let fullContent = '';
    for await (const chunk of stream) {
      if (abortController.signal.aborted) break;

      if (chunk.type === 'token' && chunk.content) {
        fullContent += chunk.content;
        writeSSEEvent(res, { type: 'token', content: chunk.content });
      } else if (chunk.type === 'error') {
        writeSSEEvent(res, { type: 'error', message: chunk.error });
        break;
      }
    }

    if (!abortController.signal.aborted && fullContent) {
      if (convId) {
        const lastUserMessage = [...(messages as Message[])].reverse().find((m) => m.role === 'user');
        await prisma.aIMessage.create({
          data: { conversationId: convId, role: 'user', content: lastUserMessage?.content || '' },
        });
        await prisma.aIMessage.create({
          data: { conversationId: convId, role: 'assistant', content: fullContent },
        });
        await prisma.aIConversation.update({
          where: { id: convId },
          data: { updatedAt: new Date() },
        });
      }

      writeSSEEvent(res, { type: 'done', conversationId: convId });
    } else if (abortController.signal.aborted) {
      writeSSEEvent(res, { type: 'aborted' });
    } else {
      writeSSEEvent(res, { type: 'done' });
    }
  } catch (error: unknown) {
    logger.error('AI stream chat error:', error);
    writeSSEEvent(res, { type: 'error', message: safeError(error) });
  } finally {
    res.end();
  }
}

export async function agentExecute(req: AuthRequest, res: Response): Promise<void> {
  const { task, projectId, conversationId, contextFiles, teamId, model } = req.body;

  if (!task || typeof task !== 'string' || task.length > 10000) {
    res.status(400).json({ error: 'task is required and must be a string (max 10000 chars)' });
    return;
  }

  setupSSEConnection(res);
  const abortController = createAbortController(req);
  const convId = conversationId as string | undefined;

  if (convId) {
    registerAgentAbort(convId, abortController);
  }

  try {
    const agentContext = {
      projectId: projectId || '',
      userId: req.userId || '',
      teamId: teamId || undefined,
      currentFileId: undefined,
      selectedFileIds: contextFiles || [],
    };

    const options = {
      maxLoops: 25,
      temperature: 0.5,
      maxTokens: 4096,
      model: model || undefined,
      signal: abortController.signal,
    };

    const history: Message[] = [];
    const stream = executeAgentTask(task, agentContext, options, history);

    let fullContent = '';
    const toolCallsLog: Array<unknown> = [];

    for await (const event of stream) {
      if (abortController.signal.aborted) break;

      if (event.type === 'token' && event.content) {
        fullContent += event.content;
        writeSSEEvent(res, { type: 'token', content: event.content });
      } else if (event.type === 'thinking' && event.content) {
        writeSSEEvent(res, { type: 'thinking', content: event.content });
      } else if (event.type === 'tool_call' && event.toolName) {
        const logEntry = { toolId: event.toolId, toolName: event.toolName, toolArgs: event.toolArgs, status: 'running', timestamp: new Date().toISOString() };
        toolCallsLog.push(logEntry);
        writeSSEEvent(res, { type: 'tool_call', toolId: event.toolId, toolName: event.toolName, toolArgs: event.toolArgs });
      } else if (event.type === 'tool_result' && event.toolName) {
        writeSSEEvent(res, { type: 'tool_result', toolId: event.toolId, toolName: event.toolName, toolResult: event.toolResult });
      } else if (event.type === 'write_file' && event.filePath) {
        writeSSEEvent(res, { type: 'write_file', filePath: event.filePath, content: event.content });
      } else if (event.type === 'done') {
        if (convId && fullContent) {
          const title = await generateConversationTitle(task);
          await prisma.aIMessage.create({
            data: { conversationId: convId, role: 'user', content: task },
          });
          await prisma.aIMessage.create({
            data: { conversationId: convId, role: 'assistant', content: fullContent, toolCalls: toolCallsLog },
          });
          await prisma.aIConversation.update({
            where: { id: convId },
            data: { updatedAt: new Date(), title },
          });
        }
        writeSSEEvent(res, { type: 'done', conversationId: convId, totalTokens: event.totalTokens });
      } else if (event.type === 'error') {
        writeSSEEvent(res, { type: 'error', message: event.message || 'Agent 执行失败' });
      }
    }
  } catch (error: unknown) {
    logger.error('AI agent execute error:', error);
    try {
      writeSSEEvent(res, { type: 'error', message: safeError(error) });
    } catch {
      // stream already closed
    }
  } finally {
    if (convId) {
      unregisterAgentAbort(convId);
    }
    res.end();
  }
}

export async function abortAgent(req: AuthRequest, res: Response): Promise<void> {
  const { conversationId } = req.body;

  if (!conversationId) {
    res.status(400).json({ error: 'conversationId is required' });
    return;
  }

  const controller = activeAgentAborts.get(conversationId);
  if (controller) {
    controller.abort();
    activeAgentAborts.delete(conversationId);
    res.json({ success: true, message: 'Agent 已中止' });
  } else {
    res.json({ success: true, message: '未找到运行的 Agent 任务' });
  }
}
