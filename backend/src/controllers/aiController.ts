import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  aiCodeCompletion,
  aiExplainCode,
  aiGenerateCode,
  aiReviewCode,
  aiImproveCode,
  aiChat,
} from '../lib/aiService';

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

export async function codeCompletion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { prefix, suffix, language } = req.body;
    if (!prefix && !suffix) {
      res.status(400).json({ error: 'prefix or suffix is required' });
      return;
    }
    if ((prefix?.length || 0) > MAX_CODE_LENGTH || (suffix?.length || 0) > MAX_CODE_LENGTH) {
      res.status(400).json({ error: '代码长度超出限制' });
      return;
    }
    const completion = await aiCodeCompletion(prefix || '', suffix || '', language || 'typescript');
    res.json({ completion });
  } catch (error: unknown) {
    logger.error('AI completion error:', error);
    res.status(500).json({ error: safeError(error) });
  }
}

export async function explainCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { code, language } = req.body;
    if (!code) {
      res.status(400).json({ error: 'code is required' });
      return;
    }
    if (code.length > MAX_CODE_LENGTH) {
      res.status(400).json({ error: '代码长度超出限制' });
      return;
    }
    const explanation = await aiExplainCode(code, language || 'typescript');
    res.json({ explanation });
  } catch (error: unknown) {
    logger.error('AI explanation error:', error);
    res.status(500).json({ error: safeError(error) });
  }
}

export async function generateCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { description, language, context } = req.body;
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
    const code = await aiGenerateCode(description, language || 'typescript', context);
    res.json({ code });
  } catch (error: unknown) {
    logger.error('AI generation error:', error);
    res.status(500).json({ error: safeError(error) });
  }
}

export async function reviewCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { code, language } = req.body;
    if (!code) {
      res.status(400).json({ error: 'code is required' });
      return;
    }
    if (code.length > MAX_CODE_LENGTH) {
      res.status(400).json({ error: '代码长度超出限制' });
      return;
    }
    const review = await aiReviewCode(code, language || 'typescript');
    res.json({ review });
  } catch (error: unknown) {
    logger.error('AI review error:', error);
    res.status(500).json({ error: safeError(error) });
  }
}

export async function improveCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { code, language, instruction } = req.body;
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
    const improvedCode = await aiImproveCode(code, language || 'typescript', instruction);
    res.json({ code: improvedCode });
  } catch (error: unknown) {
    logger.error('AI improvement error:', error);
    res.status(500).json({ error: safeError(error) });
  }
}

export async function chatWithAI(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }
    if (messages.length > 20) {
      res.status(400).json({ error: '消息数量超出限制' });
      return;
    }
    const reply = await aiChat({ messages, temperature: 0.5, maxTokens: 2048 });
    res.json({ reply });
  } catch (error: unknown) {
    logger.error('AI chat error:', error);
    res.status(500).json({ error: safeError(error) });
  }
}
