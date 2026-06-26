export type AIProviderType = 'OPENAI' | 'ANTHROPIC' | 'CUSTOM';

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCallRequest[];
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface StreamChunk {
  type: 'token' | 'done' | 'error' | 'tool_call' | 'tool_result' | 'thinking';
  content?: string;
  error?: string;
  tool?: ToolCallRequest;
  result?: ToolExecutionResult;
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

export interface ToolCallRequest {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  output: string;
  error?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolExecutionResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface AgentContext {
  projectId: string;
  userId: string;
  teamId?: string;
  currentFileId?: string;
  selectedFileIds?: string[];
}

export interface AgentLoopOptions {
  maxLoops?: number;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  signal?: AbortSignal;
}

export interface AgentStreamEvent {
  type: 'token' | 'tool_call' | 'tool_result' | 'thinking' | 'write_file' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolId?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: string;
  filePath?: string;
  patch?: { old: string; new: string };
  conversationId?: string;
  totalTokens?: number;
  message?: string;
}

export interface AIProvider {
  id: AIProviderType;
  label: string;
  chat(messages: Message[], options: ChatOptions): Promise<string>;
  streamChat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk>;
  listModels(): Promise<ModelInfo[]>;
  validateConfig(config: AIConfig): Promise<boolean>;
}
