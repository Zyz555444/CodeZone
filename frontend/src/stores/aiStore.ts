import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

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
  clearFilePatches: () => void;
  clearToolCalls: () => void;
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
  conversations: [] as AIConversation[],
  activeConversationId: null as string | null,
  messages: [] as AIMessage[],
  isStreaming: false,
  streamContent: '',
  contextFiles: [] as string[],
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

export const useAIStore = create<AIStore>()(
  immer((set) => ({
    // Initial state
    ...initialChat,
    ...initialAgent,
    ...initialEditor,

    // Chat actions
    setConversations: (convs) => set((draft) => { draft.conversations = convs; }),
    setActiveConversation: (id) => set((draft) => {
      draft.activeConversationId = id;
      draft.messages = [];
      draft.streamContent = '';
      draft.thinkingContent = '';
      draft.toolCalls = [];
      draft.filePatches = [];
    }),
    addConversation: (conv) => set((draft) => { draft.conversations.unshift(conv); }),
    removeConversation: (id) => set((draft) => {
      draft.conversations = draft.conversations.filter((c) => c.id !== id);
      if (draft.activeConversationId === id) {
        draft.activeConversationId = null;
      }
    }),
    setMessages: (msgs) => set((draft) => { draft.messages = msgs; }),
    addMessage: (msg) => set((draft) => { draft.messages.push(msg); }),
    setIsStreaming: (v) => set((draft) => { draft.isStreaming = v; }),
    appendStreamContent: (chunk) => set((draft) => { draft.streamContent += chunk; }),
    resetStreamContent: () => set((draft) => { draft.streamContent = ''; }),
    setContextFiles: (files) => set((draft) => { draft.contextFiles = files; }),
    toggleContextFile: (fileId) => set((draft) => {
      const idx = draft.contextFiles.indexOf(fileId);
      if (idx >= 0) {
        draft.contextFiles.splice(idx, 1);
      } else {
        draft.contextFiles.push(fileId);
      }
    }),
    setSelectedModel: (model) => set((draft) => { draft.selectedModel = model; }),
    setSettings: (s) => set((draft) => { draft.settings = s; }),
    setError: (e) => set((draft) => { draft.error = e; }),
    clearError: () => set((draft) => { draft.error = ''; }),

    // Agent actions
    appendThinking: (chunk) => set((draft) => { draft.thinkingContent += chunk; }),
    resetThinking: () => set((draft) => { draft.thinkingContent = ''; }),
    addToolCall: (tc) => set((draft) => { draft.toolCalls.push(tc); }),
    updateToolCall: (toolId, updates) => set((draft) => {
      const tc = draft.toolCalls.find((t) => t.toolId === toolId);
      if (tc) {
        Object.assign(tc, updates);
      }
    }),
    addFilePatch: (patch) => set((draft) => { draft.filePatches.push(patch); }),
    acceptFilePatch: (filePath) => set((draft) => {
      const patch = draft.filePatches.find((p) => p.filePath === filePath);
      if (patch) patch.accepted = true;
    }),
    rejectFilePatch: (filePath) => set((draft) => {
      const patch = draft.filePatches.find((p) => p.filePath === filePath);
      if (patch) patch.accepted = false;
    }),
    clearFilePatches: () => set((draft) => { draft.filePatches = []; }),
    clearToolCalls: () => set((draft) => { draft.toolCalls = []; }),
    setIsAgentMode: (v) => set((draft) => { draft.isAgentMode = v; }),
    incrementLoop: () => set((draft) => { draft.loopCount += 1; }),
    setExecuting: (exec) => set((draft) => { draft.isExecuting = exec; }),
    setAbortController: (ctrl) => set((draft) => { draft.abortController = ctrl; }),
    resetAgent: () => {
      const ctrl = useAIStore.getState().abortController;
      ctrl?.abort();
      set((draft) => {
        draft.thinkingContent = '';
        draft.toolCalls = [];
        draft.filePatches = [];
        draft.loopCount = 0;
        draft.isExecuting = false;
        draft.isAgentMode = false;
        draft.abortController = null;
      });
    },

    // Editor actions
    setActiveFile: (fileId) => set((draft) => { draft.activeFileId = fileId; }),
    setEditorState: (state) => set((draft) => { draft.editorState = state; }),
    addDiffFile: (file) => set((draft) => { draft.diffFiles.push(file); }),
    removeDiffFile: (filePath) => set((draft) => {
      draft.diffFiles = draft.diffFiles.filter((d) => d.filePath !== filePath);
    }),
    clearDiffFiles: () => set((draft) => { draft.diffFiles = []; }),
    setInlineCommand: (cmd) => set((draft) => { draft.inlineCommand = cmd; }),

    // Global reset
    reset: () => set((draft) => {
      Object.assign(draft, initialChat, initialAgent, initialEditor);
      draft.isAgentMode = false;
    }),
  })),
);
