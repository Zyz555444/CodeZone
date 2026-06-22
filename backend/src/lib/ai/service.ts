import { Message, ChatOptions, StreamChunk, AIConfig } from './types';
import { providerRegistry } from './providers/registry';

const BASE_URL = process.env.MCAI_LLM_BASE_URL || 'https://proxy.monkeycode-ai.com/v1';
const API_KEY = process.env.MCAI_LLM_API_KEY || process.env.OPENAI_API_KEY || '';
const MODEL = process.env.MCAI_LLM_MODEL || 'monkeycode-basic/glm-4.7';

export async function aiChat(
  messages: Message[],
  options?: ChatOptions,
  teamConfig?: Partial<AIConfig> | null,
): Promise<string> {
  if (teamConfig?.apiKey) {
    const { provider } = providerRegistry.resolve(teamConfig);
    return provider.chat(messages, options || {});
  }

  const { provider } = providerRegistry.resolve();
  return provider.chat(messages, options || {});
}

export async function* aiStreamChat(
  messages: Message[],
  options?: ChatOptions,
  teamConfig?: Partial<AIConfig> | null,
): AsyncGenerator<StreamChunk> {
  if (teamConfig?.apiKey) {
    const { provider } = providerRegistry.resolve(teamConfig);
    yield* provider.streamChat(messages, options || {});
    return;
  }

  const { provider } = providerRegistry.resolve();
  yield* provider.streamChat(messages, options || {});
}

export async function aiCodeCompletion(
  prefix: string,
  suffix: string,
  language: string,
  teamConfig?: Partial<AIConfig> | null,
): Promise<string> {
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are an expert code completion assistant. Complete the code based on the context. Return ONLY the completion code without any explanation, markdown formatting, or code fences. The language is ${language}.`,
    },
    {
      role: 'user',
      content: `Prefix code:\n\`\`\`${language}\n${prefix}\n\`\`\`\n\nSuffix code:\n\`\`\`${language}\n${suffix}\n\`\`\`\n\nProvide the completion that goes between the prefix and suffix.`,
    },
  ];

  return aiChat(messages, { temperature: 0.1, maxTokens: 512 }, teamConfig);
}

export async function aiExplainCode(
  code: string,
  language: string,
  teamConfig?: Partial<AIConfig> | null,
): Promise<string> {
  const messages: Message[] = [
    {
      role: 'system',
      content: 'You are an expert programming mentor. Explain code clearly and concisely in Chinese. Focus on what the code does, its key logic, and any notable patterns or potential issues.',
    },
    {
      role: 'user',
      content: `Explain this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``,
    },
  ];

  return aiChat(messages, { temperature: 0.3, maxTokens: 1024 }, teamConfig);
}

export async function aiGenerateCode(
  description: string,
  language: string,
  context?: string,
  teamConfig?: Partial<AIConfig> | null,
): Promise<string> {
  const contextMsg = context ? `\n\nExisting code context:\n\`\`\`${language}\n${context}\n\`\`\`` : '';

  const messages: Message[] = [
    {
      role: 'system',
      content: `You are an expert ${language} developer. Generate clean, well-structured code based on the user's description. Return ONLY the code without any explanation or markdown formatting.`,
    },
    {
      role: 'user',
      content: `Generate ${language} code for: ${description}${contextMsg}`,
    },
  ];

  return aiChat(messages, { temperature: 0.3, maxTokens: 2048 }, teamConfig);
}

export async function aiReviewCode(
  code: string,
  language: string,
  teamConfig?: Partial<AIConfig> | null,
): Promise<string> {
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are an expert code reviewer. Review the code and provide constructive feedback in Chinese. Focus on:
1. Potential bugs or logic errors
2. Code quality and readability issues
3. Performance concerns
4. Security vulnerabilities
5. Best practice violations

Be specific and actionable.`,
    },
    {
      role: 'user',
      content: `Review this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``,
    },
  ];

  return aiChat(messages, { temperature: 0.3, maxTokens: 1536 }, teamConfig);
}

export async function aiImproveCode(
  code: string,
  language: string,
  instruction: string,
  teamConfig?: Partial<AIConfig> | null,
): Promise<string> {
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are an expert ${language} developer. Improve the code based on the user's instruction. Return ONLY the improved code without any explanation or markdown formatting.`,
    },
    {
      role: 'user',
      content: `Original ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nImprovement request: ${instruction}\n\nReturn the complete improved code.`,
    },
  ];

  return aiChat(messages, { temperature: 0.3, maxTokens: 2048 }, teamConfig);
}

export { BASE_URL, API_KEY, MODEL };
