import { Message, ChatOptions, StreamChunk, ModelInfo, AIConfig, AIProvider } from '../types';

function buildUrl(endpoint: string): string {
  const base = endpoint.replace(/\/+$/, '');
  return `${base}/chat/completions`;
}

export class OpenAIProvider implements AIProvider {
  id: AIProvider['id'] = 'OPENAI';
  label = 'OpenAI Compatible';
  private baseEndpoint: string;
  private endpoint: string;
  private apiKey: string;
  private defaultModel: string;

  constructor(endpoint: string, apiKey: string, defaultModel: string) {
    this.baseEndpoint = endpoint.replace(/\/+$/, '');
    this.endpoint = buildUrl(endpoint);
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async chat(messages: Message[], options: ChatOptions): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 2048,
          top_p: options.topP ?? 1,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`AI API error ${response.status}: ${text}`);
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content || '';
    } finally {
      clearTimeout(timeout);
    }
  }

  async *streamChat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    function isCompleteArguments(args: string): boolean {
      if (args.trim() === '') return true;
      try {
        JSON.parse(args);
        return true;
      } catch {
        return false;
      }
    }

    try {
      const body: Record<string, unknown> = {
        model: this.defaultModel,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 2048,
        top_p: options.topP ?? 1,
        stream: true,
      };
      if (options.tools && options.tools.length > 0) {
        body.tools = options.tools;
        body.tool_choice = options.tool_choice || 'auto';
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        yield { type: 'error', error: `AI API error ${response.status}: ${text}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      const toolCallAccumulator = new Map<number, { id: string; name: string; arguments: string }>();
      const emittedToolCalls = new Set<number>();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed?.choices?.[0]?.delta;
              if (!delta) continue;

              const content = delta.content;
              if (content) {
                yield { type: 'token', content };
              }

              if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  const existing = toolCallAccumulator.get(idx);
                  if (existing) {
                    if (tc.function?.arguments) {
                      existing.arguments += tc.function.arguments;
                    }
                  } else {
                    toolCallAccumulator.set(idx, {
                      id: tc.id || `call_${idx}`,
                      name: tc.function?.name || '',
                      arguments: tc.function?.arguments || '',
                    });
                  }
                  const acc = toolCallAccumulator.get(idx)!;
                  if (!emittedToolCalls.has(idx) && acc.arguments && isCompleteArguments(acc.arguments)) {
                    emittedToolCalls.add(idx);
                    yield {
                      type: 'tool_call',
                      tool: {
                        id: acc.id,
                        type: 'function',
                        function: {
                          name: acc.name,
                          arguments: acc.arguments,
                        },
                      },
                    };
                  }
                }
              }
            } catch {
              // skip unparseable lines
            }
          }
        }
      } finally {
        for (const [idx, acc] of toolCallAccumulator) {
          if (emittedToolCalls.has(idx)) continue;
          yield {
            type: 'tool_call',
            tool: {
              id: acc.id,
              type: 'function',
              function: { name: acc.name, arguments: acc.arguments },
            },
          };
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseEndpoint}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      if (!response.ok) return [];
      const data = await response.json() as { data?: Array<{ id: string }> };
      return (data.data || []).map((m) => ({
        id: m.id,
        name: m.id,
        provider: 'OPENAI' as const,
        contextWindow: 128000,
      }));
    } catch {
      return [];
    }
  }

  async validateConfig(config: AIConfig): Promise<boolean> {
    try {
      const response = await fetch(buildUrl(config.endpoint || this.baseEndpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.defaultModel,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
