import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import { decryptApiKey } from '../lib/ai/crypto';
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
import { Message } from '../lib/ai/types';

const MAX_CODE_LENGTH = 50000;
const MAX_MESSAGE_LENGTH = 2000;

function safeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'AI 请求超时，请重试';
    if (error.message.includes('429')) return 'AI 请求过于频繁，请稍后再试';
    if (error.message.includes('401') || error.message.includes('403')) return 'AI 服务认证失败';
    logger.error('AI error:', error.message);
  }
  return 'AI 服务暂时不可用，请稍后重试';
}

async function getTeamConfig(teamId?: string) {
  if (!teamId) return null;
  const settings = await prisma.teamAISettings.findUnique({
    where: { teamId },
    select: {
      provider: true,
      endpoint: true,
      apiKey: true,
      defaultModel: true,
      enabledModels: true,
      parameters: true,
    },
  });
  if (!settings?.apiKey) return null;
  return {
    provider: settings.provider as 'OPENAI' | 'ANTHROPIC' | 'CUSTOM',
    endpoint: settings.endpoint || undefined,
    apiKey: decryptApiKey(settings.apiKey),
    defaultModel: settings.defaultModel || undefined,
    enabledModels: settings.enabledModels as string[],
    parameters: settings.parameters as Record<string, unknown>,
  };
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
    res.status(500).json({ error: safeError(error) });
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

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

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
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`);
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', message: chunk.error })}\n\n`);
        break;
      }
    }

    if (!abortController.signal.aborted && fullContent) {
      if (convId) {
        await prisma.aIMessage.create({
          data: { conversationId: convId, role: 'user', content: messages[messages.length - 1]?.content || '' },
        });
        await prisma.aIMessage.create({
          data: { conversationId: convId, role: 'assistant', content: fullContent },
        });
        await prisma.aIConversation.update({
          where: { id: convId },
          data: { updatedAt: new Date() },
        });
      }

      res.write(`data: ${JSON.stringify({ type: 'done', conversationId: convId })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    }
  } catch (error: unknown) {
    logger.error('AI stream chat error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: safeError(error) })}\n\n`);
  } finally {
    res.end();
  }
}
