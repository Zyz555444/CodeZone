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

interface AgentToolCall {
  id: string;
  toolId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: string;
  collapsed: boolean;
}

interface FilePatch {
  filePath: string;
  oldContent?: string;
  newContent?: string;
  accepted: boolean | null;
}

export interface DiffFile {
  filePath: string;
  oldContent: string | null;
  newContent: string;
  accepted: boolean | null;
}

export type EditorState = 'idle' | 'agent_running' | 'diff_preview';

interface AIStore {
  // Chat slice
  conversations: AIConversation[];
  activeConversationId: string | null;
  messages: AIMessage[];
  isStreaming: boolean;
  streamContent: string;
  contextFiles: string[];
  selectedModel: string;
  settings: AISettings | null;
  error: string;

  // Agent slice
  thinkingContent: string;
  toolCalls: AgentToolCall[];
  filePatches: FilePatch[];
  isAgentMode: boolean;
  loopCount: number;
  isExecuting: boolean;
  abortController: AbortController | null;

  // Editor slice
  activeFileId: string | null;
  editorState: EditorState;
  diffFiles: DiffFile[];
  inlineCommand: string | null;

  // Chat actions
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

  // Agent actions
  appendThinking: (chunk: string) => void;
  resetThinking: () => void;
  addToolCall: (tc: AgentToolCall) => void;
  updateToolCall: (toolId: string, updates: Partial<AgentToolCall>) => void;
  addFilePatch: (patch: FilePatch) => void;
  acceptFilePatch: (filePath: string) => void;
  rejectFilePatch: (filePath: string) => void;
  setIsAgentMode: (v: boolean) => void;
  incrementLoop: () => void;
  setExecuting: (exec: boolean) => void;
  setAbortController: (ctrl: AbortController | null) => void;
  resetAgent: () => void;

  // Editor actions
  setActiveFile: (fileId: string | null) => void;
  setEditorState: (state: EditorState) => void;
  addDiffFile: (file: DiffFile) => void;
  removeDiffFile: (filePath: string) => void;
  clearDiffFiles: () => void;
  setInlineCommand: (cmd: string | null) => void;

  // Global
  reset: () => void;
}

const initialChat = {
  conversations: [],
  activeConversationId: null as string | null,
  messages: [],
  isStreaming: false,
  streamContent: '',
  contextFiles: [],
  selectedModel: '',
  settings: null as AISettings | null,
  error: '',
};

const initialAgent = {
  thinkingContent: '',
  toolCalls: [] as AgentToolCall[],
  filePatches: [] as FilePatch[],
  isAgentMode: false,
  loopCount: 0,
  isExecuting: false,
  abortController: null as AbortController | null,
};

const initialEditor = {
  activeFileId: null as string | null,
  editorState: 'idle' as EditorState,
  diffFiles: [] as DiffFile[],
  inlineCommand: null as string | null,
};

export const useAIStore = create<AIStore>((set) => ({
  // Initial state
  ...initialChat,
  ...initialAgent,
  ...initialEditor,

  // Chat actions
  setConversations: (convs) => set({ conversations: convs }),
  setActiveConversation: (id) => set({
    activeConversationId: id,
    messages: [],
    streamContent: '',
    thinkingContent: '',
    toolCalls: [],
    filePatches: [],
  }),
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

  // Agent actions
  appendThinking: (chunk) => set((s) => ({ thinkingContent: s.thinkingContent + chunk })),
  resetThinking: () => set({ thinkingContent: '' }),
  addToolCall: (tc) => set((s) => ({ toolCalls: [...s.toolCalls, tc] })),
  updateToolCall: (toolId, updates) => set((s) => ({
    toolCalls: s.toolCalls.map((tc) => tc.toolId === toolId ? { ...tc, ...updates } : tc),
  })),
  addFilePatch: (patch) => set((s) => ({ filePatches: [...s.filePatches, patch] })),
  acceptFilePatch: (filePath) => set((s) => ({
    filePatches: s.filePatches.map((p) => p.filePath === filePath ? { ...p, accepted: true } : p),
  })),
  rejectFilePatch: (filePath) => set((s) => ({
    filePatches: s.filePatches.map((p) => p.filePath === filePath ? { ...p, accepted: false } : p),
  })),
  setIsAgentMode: (v) => set({ isAgentMode: v }),
  incrementLoop: () => set((s) => ({ loopCount: s.loopCount + 1 })),
  setExecuting: (exec) => set({ isExecuting: exec }),
  setAbortController: (ctrl) => set({ abortController: ctrl }),
   resetAgent: () => {
     const ctrl = useAIStore.getState().abortController;
     ctrl?.abort();
     set({
       thinkingContent: '',
       toolCalls: [],
       filePatches: [],
       loopCount: 0,
       isExecuting: false,
       isAgentMode: false,
       abortController: null,
     });
   },

  // Editor actions
  setActiveFile: (fileId) => set({ activeFileId: fileId }),
  setEditorState: (state) => set({ editorState: state }),
  addDiffFile: (file) => set((s) => ({ diffFiles: [...s.diffFiles, file] })),
  removeDiffFile: (filePath) => set((s) => ({
    diffFiles: s.diffFiles.filter((d) => d.filePath !== filePath),
  })),
  clearDiffFiles: () => set({ diffFiles: [] }),
  setInlineCommand: (cmd) => set({ inlineCommand: cmd }),

  // Global reset
  reset: () => set({
    ...initialChat,
    ...initialAgent,
    ...initialEditor,
    isAgentMode: false,
  }),
}));
