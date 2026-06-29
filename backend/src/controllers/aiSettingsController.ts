import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { providerRegistry } from '../lib/ai/providers/registry';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../lib/ai/crypto';

const settingsSchema = z.object({
  provider: z.enum(['OPENAI', 'ANTHROPIC', 'CUSTOM']),
  endpoint: z.string().optional(),
  apiKey: z.string().optional(),
  defaultModel: z.string().optional(),
  enabledModels: z.array(z.string()).optional(),
  parameters: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(128000).optional(),
    topP: z.number().min(0).max(1).optional(),
  }).optional(),
  isEnabled: z.boolean().optional(),
});

function ensureTeamManager(teamMember: { role: string } | null): boolean {
  if (!teamMember) return false;
  return teamMember.role === 'OWNER' || teamMember.role === 'ADMIN';
}

export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId } = req.params;
    if (!teamId) {
      res.status(400).json({ error: 'teamId is required' });
      return;
    }

    const userId = req.userId!;
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true, status: true },
    });

    if (!member || member.status !== 'ACTIVE') {
      res.status(403).json({ error: '您不是该团队的成员' });
      return;
    }

    const settings = await prisma.teamAISettings.findUnique({
      where: { teamId },
    });

    if (!settings) {
      res.json({ settings: null, defaults: providerRegistry.getDefaultConfig() });
      return;
    }

    const { apiKey, ...rest } = settings;
    res.json({
      settings: {
        ...rest,
        apiKey: apiKey ? maskApiKey(decryptApiKey(apiKey)) : null,
        hasApiKey: !!apiKey,
      },
    });
  } catch (error) {
    logger.error('获取 AI 设置失败', { error });
    res.status(500).json({ error: '获取 AI 设置失败' });
  }
}

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId } = req.params;
    if (!teamId) {
      res.status(400).json({ error: 'teamId is required' });
      return;
    }

    const userId = req.userId!;
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true, status: true },
    });

    if (!ensureTeamManager(member)) {
      res.status(403).json({ error: '仅团队 OWNER 或 ADMIN 可以修改 AI 设置' });
      return;
    }

    const parsed = settingsSchema.parse(req.body);

    const updateData: Record<string, unknown> = {};
    if (parsed.provider !== undefined) updateData.provider = parsed.provider;
    if (parsed.endpoint !== undefined) updateData.endpoint = parsed.endpoint;
    if (parsed.defaultModel !== undefined) updateData.defaultModel = parsed.defaultModel;
    if (parsed.enabledModels !== undefined) updateData.enabledModels = parsed.enabledModels;
    if (parsed.parameters !== undefined) updateData.parameters = parsed.parameters;
    if (parsed.isEnabled !== undefined) updateData.isEnabled = parsed.isEnabled;

    if (parsed.apiKey !== undefined && parsed.apiKey !== '') {
      updateData.apiKey = encryptApiKey(parsed.apiKey);
    }

    const settings = await prisma.teamAISettings.upsert({
      where: { teamId },
      create: {
        teamId,
        provider: parsed.provider || 'OPENAI',
        endpoint: parsed.endpoint || null,
        apiKey: parsed.apiKey ? encryptApiKey(parsed.apiKey) : null,
        defaultModel: parsed.defaultModel || null,
        enabledModels: parsed.enabledModels || [],
        parameters: parsed.parameters || {},
        isEnabled: parsed.isEnabled ?? true,
      },
      update: updateData,
    });

    logger.info('AI 设置已更新', { teamId, userId });

    const { apiKey, ...rest } = settings;
    res.json({
      settings: {
        ...rest,
        apiKey: apiKey ? maskApiKey(decryptApiKey(apiKey)) : null,
        hasApiKey: !!apiKey,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '参数验证失败', details: error.errors });
      return;
    }
    logger.error('更新 AI 设置失败', { error });
    res.status(500).json({ error: '更新 AI 设置失败' });
  }
}

export async function validateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId } = req.params;
    if (!teamId) {
      res.status(400).json({ error: 'teamId is required' });
      return;
    }

    const userId = req.userId!;
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true, status: true },
    });

    if (!member || member.status !== 'ACTIVE') {
      res.status(403).json({ error: '您不是该团队的成员' });
      return;
    }

    const body = z.object({
      provider: z.enum(['OPENAI', 'ANTHROPIC', 'CUSTOM']),
      endpoint: z.string().optional(),
      apiKey: z.string(),
      defaultModel: z.string(),
    }).parse(req.body);

    const isValid = await providerRegistry.resolve({
      provider: body.provider,
      endpoint: body.endpoint,
      apiKey: body.apiKey,
      defaultModel: body.defaultModel,
      enabledModels: [],
      parameters: {},
    }).provider.validateConfig({
      provider: body.provider,
      endpoint: body.endpoint,
      apiKey: body.apiKey,
      defaultModel: body.defaultModel,
      enabledModels: [],
      parameters: {},
    });

    if (isValid) {
      res.json({ valid: true });
    } else {
      res.json({ valid: false, error: '无法连接到 AI 服务，请检查配置' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '参数验证失败', details: error.errors });
      return;
    }
    logger.error('验证 AI 设置失败', { error });
    res.status(500).json({ error: '验证失败' });
  }
}

export async function listModels(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { teamId } = req.params;

    if (teamId) {
      const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: req.userId! } },
        select: { status: true },
      });
      if (!member || member.status !== 'ACTIVE') {
        res.status(403).json({ error: '您不是该团队的成员' });
        return;
      }
    }

    const models = [{ id: 'monkeycode-basic/glm-4.7', name: 'GLM 4.7 (默认)', provider: 'OPENAI', contextWindow: 128000 }];

    if (teamId) {
      const settings = await prisma.teamAISettings.findUnique({
        where: { teamId },
        select: { enabledModels: true },
      });
      if (settings?.enabledModels && Array.isArray(settings.enabledModels)) {
        const extra = (settings.enabledModels as string[]).map((m) => ({
          id: m, name: m, provider: 'OPENAI', contextWindow: 128000,
        }));
        models.push(...extra);
      }
    }

    res.json({ models });
  } catch (error) {
    logger.error('获取模型列表失败', { error });
    res.status(500).json({ error: '获取模型列表失败' });
  }
}
