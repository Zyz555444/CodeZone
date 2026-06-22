export type AIProviderType = 'OPENAI' | 'ANTHROPIC' | 'CUSTOM';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface StreamChunk {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProviderType;
  contextWindow: number;
}

export interface AIConfig {
  provider: AIProviderType;
  endpoint?: string;
  apiKey: string;
  defaultModel: string;
  enabledModels: string[];
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

export interface ToolCall {
  id: string;
  type: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  output: string;
  error?: string;
}

export interface AIProvider {
  id: AIProviderType;
  label: string;
  chat(messages: Message[], options: ChatOptions): Promise<string>;
  streamChat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk>;
  listModels(): Promise<ModelInfo[]>;
  validateConfig(config: AIConfig): Promise<boolean>;
}
