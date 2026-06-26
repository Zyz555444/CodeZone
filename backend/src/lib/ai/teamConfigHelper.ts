import { prisma } from '../prisma';
import { decryptApiKey } from './crypto';

export async function getTeamConfig(teamId?: string) {
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
