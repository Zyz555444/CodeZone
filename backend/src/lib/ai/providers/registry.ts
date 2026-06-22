import { AIProvider, AIConfig, AIProviderType } from '../types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { CustomProvider } from './custom';

const DEFAULT_ENDPOINTS: Record<string, string> = {
  OPENAI: 'https://api.openai.com',
  ANTHROPIC: 'https://api.anthropic.com',
};

class ProviderRegistryImpl {
  private providers: Map<AIProviderType, AIProvider> = new Map();

  getDefaultConfig(): AIConfig {
    return {
      provider: 'OPENAI',
      endpoint: process.env.MCAI_LLM_BASE_URL || 'https://proxy.monkeycode-ai.com/v1',
      apiKey: process.env.MCAI_LLM_API_KEY || process.env.OPENAI_API_KEY || '',
      defaultModel: process.env.MCAI_LLM_MODEL || 'monkeycode-basic/glm-4.7',
      enabledModels: [],
      parameters: {},
    };
  }

  resolve(teamSettings?: Partial<AIConfig> | null): { provider: AIProvider; config: AIConfig } {
    const defaults = this.getDefaultConfig();

    const config: AIConfig = {
      provider: teamSettings?.provider || defaults.provider,
      endpoint: teamSettings?.endpoint || defaults.endpoint,
      apiKey: teamSettings?.apiKey || defaults.apiKey,
      defaultModel: teamSettings?.defaultModel || defaults.defaultModel,
      enabledModels: teamSettings?.enabledModels || [],
      parameters: {
        ...defaults.parameters,
        ...(teamSettings?.parameters || {}),
      },
    };

    if (!config.apiKey) {
      throw new Error('AI 服务未配置，请联系团队管理员在设置中配置 AI API Key');
    }

    const provider = this.getOrCreateProvider(config);
    return { provider, config };
  }

  private getOrCreateProvider(config: AIConfig): AIProvider {
    const cached = this.providers.get(config.provider);
    if (cached) return cached;

    const endpoint = config.endpoint || DEFAULT_ENDPOINTS[config.provider] || '';

    let provider: AIProvider;
    switch (config.provider) {
      case 'ANTHROPIC':
        provider = new AnthropicProvider(endpoint, config.apiKey, config.defaultModel);
        break;
      case 'CUSTOM':
        provider = new CustomProvider(endpoint, config.apiKey, config.defaultModel);
        break;
      case 'OPENAI':
      default:
        provider = new OpenAIProvider(endpoint, config.apiKey, config.defaultModel);
        break;
    }

    this.providers.set(config.provider, provider);
    return provider;
  }

  clearCache(): void {
    this.providers.clear();
  }
}

export const providerRegistry = new ProviderRegistryImpl();
