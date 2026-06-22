import { Message, ChatOptions, StreamChunk, ModelInfo, AIConfig, AIProvider } from '../types';

const ANTHROPIC_VERSION = '2023-06-01';

export class AnthropicProvider implements AIProvider {
  id = 'ANTHROPIC' as const;
  label = 'Anthropic';
  private endpoint: string;
  private apiKey: string;
  private defaultModel: string;

  constructor(endpoint: string, apiKey: string, defaultModel: string) {
    this.endpoint = endpoint.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  private convertMessages(messages: Message[]): { system?: string; messages: Array<{ role: string; content: string }> } {
    let systemPrompt = '';
    const converted: Array<{ role: string; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n' : '') + msg.content;
      } else {
        converted.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    return { system: systemPrompt || undefined, messages: converted };
  }

  async chat(messages: Message[], options: ChatOptions): Promise<string> {
    const { system, messages: converted } = this.convertMessages(messages);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const body: Record<string, unknown> = {
        model: this.defaultModel,
        messages: converted,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.3,
      };
      if (system) body.system = system;

      const response = await fetch(`${this.endpoint}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Anthropic API error ${response.status}: ${text}`);
      }

      const data = await response.json() as {
        content?: Array<{ type: string; text?: string }>;
      };
      const textBlocks = data.content?.filter((c) => c.type === 'text') || [];
      return textBlocks.map((b) => b.text || '').join('');
    } finally {
      clearTimeout(timeout);
    }
  }

  async *streamChat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk> {
    const { system, messages: converted } = this.convertMessages(messages);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const body: Record<string, unknown> = {
        model: this.defaultModel,
        messages: converted,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.3,
        stream: true,
      };
      if (system) body.system = system;

      const response = await fetch(`${this.endpoint}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        yield { type: 'error', error: `Anthropic API error ${response.status}: ${text}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

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
          try {
            const event = JSON.parse(dataStr);

            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield { type: 'token', content: event.delta.text };
            } else if (event.type === 'message_stop') {
              return;
            } else if (event.type === 'error') {
              yield { type: 'error', error: event.error?.message || 'Anthropic streaming error' };
              return;
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'ANTHROPIC', contextWindow: 200000 },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'ANTHROPIC', contextWindow: 200000 },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'ANTHROPIC', contextWindow: 200000 },
    ];
  }

  async validateConfig(config: AIConfig): Promise<boolean> {
    try {
      const response = await fetch(`${(config.endpoint || this.endpoint).replace(/\/+$/, '')}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
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
