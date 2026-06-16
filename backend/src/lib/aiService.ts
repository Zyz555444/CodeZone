const BASE_URL = process.env.MCAI_LLM_BASE_URL || 'https://proxy.monkeycode-ai.com/v1';
const API_KEY = process.env.MCAI_LLM_API_KEY || process.env.OPENAI_API_KEY || '';
const MODEL = process.env.MCAI_LLM_MODEL || 'monkeycode-basic/glm-4.7';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export async function aiChat({ messages, temperature = 0.3, maxTokens = 2048 }: AIChatRequest): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI API error ${response.status}: ${text}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timeout);
  }
}

export async function aiCodeCompletion(prefix: string, suffix: string, language: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an expert code completion assistant. Complete the code based on the context. Return ONLY the completion code without any explanation, markdown formatting, or code fences. The language is ${language}.`,
    },
    {
      role: 'user',
      content: `Prefix code:\n\`\`\`${language}\n${prefix}\n\`\`\`\n\nSuffix code:\n\`\`\`${language}\n${suffix}\n\`\`\`\n\nProvide the completion that goes between the prefix and suffix.`,
    },
  ];

  return aiChat({ messages, temperature: 0.1, maxTokens: 512 });
}

export async function aiExplainCode(code: string, language: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are an expert programming mentor. Explain code clearly and concisely in Chinese. Focus on what the code does, its key logic, and any notable patterns or potential issues. Keep explanations brief but informative.',
    },
    {
      role: 'user',
      content: `Explain this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``,
    },
  ];

  return aiChat({ messages, temperature: 0.3, maxTokens: 1024 });
}

export async function aiGenerateCode(description: string, language: string, context?: string): Promise<string> {
  const contextMsg = context ? `\n\nExisting code context:\n\`\`\`${language}\n${context}\n\`\`\`` : '';

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an expert ${language} developer. Generate clean, well-structured, production-quality code based on the user's description. Return ONLY the code without any explanation, markdown formatting, or code fences. Follow best practices and include helpful comments.`,
    },
    {
      role: 'user',
      content: `Generate ${language} code for: ${description}${contextMsg}`,
    },
  ];

  return aiChat({ messages, temperature: 0.3, maxTokens: 2048 });
}

export async function aiReviewCode(code: string, language: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an expert code reviewer. Review the code and provide constructive feedback in Chinese. Focus on:
1. Potential bugs or logic errors
2. Code quality and readability issues
3. Performance concerns
4. Security vulnerabilities
5. Best practice violations

Be specific and actionable. Only flag real issues - don't nitpick.`,
    },
    {
      role: 'user',
      content: `Review this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``,
    },
  ];

  return aiChat({ messages, temperature: 0.3, maxTokens: 1536 });
}

export async function aiImproveCode(code: string, language: string, instruction: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an expert ${language} developer. Improve the code based on the user's instruction. Return ONLY the improved code without any explanation, markdown formatting, or code fences. Keep the improvements focused on what was requested.`,
    },
    {
      role: 'user',
      content: `Original ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nImprovement request: ${instruction}\n\nReturn the complete improved code.`,
    },
  ];

  return aiChat({ messages, temperature: 0.3, maxTokens: 2048 });
}
