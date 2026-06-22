import { create } from 'zustand';

interface AIConversation {
  id: string;
  title: string;
  modelId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

interface AIMessage {
  id: string;
  role: string;
  content: string;
  toolCalls?: unknown;
  tokenCount?: number;
  createdAt: string;
}

interface AISettings {
  id: string;
  teamId: string;
  provider: string;
  endpoint: string | null;
  hasApiKey: boolean;
  defaultModel: string | null;
  enabledModels: string[];
  parameters: Record<string, unknown>;
  isEnabled: boolean;
}

interface AIState {
  conversations: AIConversation[];
  activeConversationId: string | null;
  messages: AIMessage[];
  isStreaming: boolean;
  streamContent: string;
  contextFiles: string[];
  selectedModel: string;
  settings: AISettings | null;
  error: string;

  setConversations: (convs: AIConversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  addConversation: (conv: AIConversation) => void;
  removeConversation: (id: string) => void;
  setMessages: (msgs: AIMessage[]) => void;
  addMessage: (msg: AIMessage) => void;
  setIsStreaming: (v: boolean) => void;
  appendStreamContent: (chunk: string) => void;
  resetStreamContent: () => void;
  setContextFiles: (files: string[]) => void;
  toggleContextFile: (fileId: string) => void;
  setSelectedModel: (model: string) => void;
  setSettings: (s: AISettings | null) => void;
  setError: (e: string) => void;
  clearError: () => void;
  reset: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamContent: '',
  contextFiles: [],
  selectedModel: '',
  settings: null,
  error: '',

  setConversations: (convs) => set({ conversations: convs }),
  setActiveConversation: (id) => set({ activeConversationId: id, messages: [], streamContent: '' }),
  addConversation: (conv) => set((s) => ({ conversations: [conv, ...s.conversations] })),
  removeConversation: (id) => set((s) => ({
    conversations: s.conversations.filter((c) => c.id !== id),
    activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
  })),
  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setIsStreaming: (v) => set({ isStreaming: v }),
  appendStreamContent: (chunk) => set((s) => ({ streamContent: s.streamContent + chunk })),
  resetStreamContent: () => set({ streamContent: '' }),
  setContextFiles: (files) => set({ contextFiles: files }),
  toggleContextFile: (fileId) => set((s) => ({
    contextFiles: s.contextFiles.includes(fileId)
      ? s.contextFiles.filter((f) => f !== fileId)
      : [...s.contextFiles, fileId],
  })),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setSettings: (s) => set({ settings: s }),
  setError: (e) => set({ error: e }),
  clearError: () => set({ error: '' }),
  reset: () => set({
    conversations: [],
    activeConversationId: null,
    messages: [],
    isStreaming: false,
    streamContent: '',
    contextFiles: [],
    error: '',
  }),
}));
