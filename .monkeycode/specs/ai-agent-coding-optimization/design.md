# AI Agent Coding 全面优化 - 技术设计文档

Feature Name: ai-agent-coding-optimization
Created: 2026-06-26
Status: 已确认

## 概述

在现有 P1+P2+P3 AI Agent Coding 骨架基础上，对标 opencode 行为模式进行全面架构升级。核心目标：实现"用户写 prompt → Agent 自主执行(思考+读文件+搜索+写文件+终端) → 变更实时回显 Monaco 编辑器 → 逐条接受/拒绝"的完整闭环。

采用**方案 B：架构升级 + 深度集成**。不改基础技术栈，在现有代码上重构架构。

Yohaku 设计系统全站重构在本次 Agent 优化之后单独进行。

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│  CodeEditor (Monaco)                    ┌──────────────────────┐│
│  ┌───────────────────┐                  │  AIPanel             ││
│  │ GhostTextProvider  │  Ctrl+K          │  ┌────────────────┐ ││
│  │ (Tab接受补全)      │  InlineCommand   │  │ MessageList    │ ││
│  ├───────────────────┤                  │  │ (对话+代码引用) │ ││
│  │ InlineAIMenu       │                  │  ├────────────────┤ ││
│  │ (选中文本操作)      │  selection       │  │ AgentThinking  │ ││
│  ├───────────────────┤                  │  │ (时间线+跳转)  │ ││
│  │ InlineDiffEditor   │  agent_write     │  ├────────────────┤ ││
│  │ (变更预览+接受拒绝) │                  │  │ FileDiffPanel  │ ││
│  └───────────────────┘                  │  │ (Monaco Diff)  │ ││
│                                           │  ├────────────────┤ ││
│  ┌─────────────────────────────────┐    │  │ InputArea      │ ││
│  │ EditorCommandBus (消息总线)      │◄───┼──│ (模式切换/发送) │ ││
│  └─────────────────────────────────┘    │  └────────────────┘ ││
└──────────────────────────────────────────┴──────────────────────┘
         │    ▲                                        │    ▲
         │    │              aiStore (Zustand+immer)    │    │
         ▼    │              ┌────────────────────┐     ▼    │
   SSE: /api/ai/chat/stream  │ agent slice         │ SSE: /api/ai/agent
         │    │              │ chat slice          │     │    │
         ▼    │              │ editor slice        │     ▼    │
┌────────────────────────┐   └────────────────────┘  ┌──────────────┐
│ aiStreamChat (service)  │                            │ AgentLoop    │
│ + ContextCollector     │                            │ (generator)  │
└────────────────────────┘                            │ max 25轮     │
                                                      │ tools: 10个  │
                                                      └──────┬───────┘
                                                             │
                                              ┌──────────────┴───────┐
                                              │   ToolRegistry        │
                                              │ read_file  write_file │
                                              │ search_code list_files│
                                              │ replace_in_file        │
                                              │ grep_files glob_files  │
                                              │ execute_command        │
                                              │ web_fetch read_lints   │
                                              └──────────────────────┘
```

## 第一节：后端 Agent 引擎重构

### 1.1 AgentLoop 升级 (`backend/src/lib/ai/agent.ts`)

```
[旧流程]
  收集上下文 → 构建消息 → 循环:
    LLM调用(等待全部token) → 收集tool_calls(等待全部) → 执行工具(顺序) → 反馈结果

[新流程]
  收集上下文 → 构建消息 → 循环(最多25轮):
    LLM调用(流式) → 边收token边yield → 边收tool_call边yield
    → 并行执行工具(独立的可并行) → 结果截断(token预算) → 反馈结果
```

**新增特性：**
- 循环上限从 15 提升到 25 轮
- **流式 tool_call**：收到一个 tool_call 就 yield 一个事件，不等待全部完成
- **并行工具执行**：同一轮中，可并行的工具（read_file, search_code, grep_files, glob_files, web_fetch, read_lints）并发执行；写类工具串行执行
- **结果按 token 预算截断**：工具输出超过 `MAX_TOOL_OUTPUT_TOKENS(8000)` 时截断并标注 `[...结果已截断，原始长度 X tokens]`
- **AbortSignal 传播**：客户端断开时立即停止循环，正在执行的工具收到 signal 后尽快退出
- **system prompt 三级注入**：基础能力（固定模板）→ 项目上下文（context.ts 动态生成）→ 用户自定义指令（从 TeamAISettings.instructions 读取）
- 清理死代码：删除第 144-147 行不可达代码
- 修复类型安全：`teamConfig as any` 改为正确的类型转换
- 自动生成对话标题：Agent 完成后，调用轻量级 LLM 任务摘要作为对话标题

### 1.2 工具系统扩展 (`backend/src/lib/ai/tools.ts`)

现有 5 个 → 新增 5 个 = 10 个工具。

**新增工具：**

| 工具 | 用途 | 危险 | 确认 |
|------|------|------|------|
| `replace_in_file` | 精准字符串替换（oldStr → newStr），唯一匹配校验 | 修改文件 | 需确认 |
| `grep_files` | 正则表达式搜索文件内容，返回匹配行+上下文 | 否 | 否 |
| `glob_files` | 文件名 glob 模式匹配 | 否 | 否 |
| `execute_command` | 沙箱执行终端命令，危险命令黑名单 | 是 | 需确认 |
| `web_fetch` | 获取 HTTP(S) URL 内容（Markdown 格式） | 否 | 否 |
| `read_lints` | 读取 ESLint/TypeScript 诊断信息 | 否 | 否 |

**工具参数详情：**

```typescript
// replace_in_file
{
  filePath: string;       // 文件路径（支持 codefile:id 或 path）
  oldString: string;      // 要替换的原始字符串（必须在文件中唯一匹配）
  newString: string;      // 替换后的新字符串
}

// grep_files
{
  pattern: string;        // 正则表达式
  path?: string;          // 搜索路径过滤（可选）
  maxResults?: number;    // 结果上限，默认 50
}

// glob_files
{
  pattern: string;        // glob 模式，如 "src/**/*.ts"
  maxResults?: number;    // 结果上限，默认 200
}

// execute_command
{
  command: string;        // 要执行的命令
  workdir?: string;       // 工作目录，默认 /workspace
}

// web_fetch
{
  url: string;            // 目标 URL（仅 HTTPS）
  format?: 'text' | 'markdown';  // 返回格式，默认 markdown
}

// read_lints
{
  path?: string;          // 文件/目录路径（可选，默认为项目根目录）
}
```

**约束：**
- `execute_command`：危险命令黑名单拦截（rm -rf, shutdown, reboot, git push --force, docker rm 等），超时 30 秒，输出上限 50KB，工作目录限制在 /workspace
- `web_fetch`：仅 HTTPS，超时 15 秒，响应上限 100KB
- `grep_files`：结果上限 50 条，每条含文件路径+行号+上下文行（前后各 2 行）
- `replace_in_file`：oldString 在文件中必须恰好匹配 1 次；多匹配返回所有位置让 Agent 选择；零匹配返回错误
- `write_file`：清理 `DANGEROUS_COMMANDS_PATTERNS` 死代码或将黑名单逻辑连接给 execute_command

### 1.3 控制器改进 (`backend/src/controllers/aiController.ts`)

**修复：**
- `agentExecute` 中 `toolCalls: {}` → 正确存储工具调用记录的数组 `toolCalls: []`
- 对话持久化：Agent 完成后自动生成对话标题，保存完整消息历史（含 tool 角色消息）
- 新增 `abortAgent` 端点：`POST /api/ai/agent/abort` — 取消运行中的 Agent 任务，传入 conversationId

**错误分类处理：**
```typescript
function classifyError(error: any): {
  type: 'auth' | 'rate_limit' | 'server' | 'timeout' | 'network' | 'unknown';
  retryable: boolean;
  message: string;
}
```

- 401/403 → auth, 不可重试
- 429 → rate_limit, 指数退避可重试
- 5xx → server, 可重试 1 次
- timeout → timeout, 可重试 1 次
- 前端根据 type 决定 UI 展示和用户操作建议

### 1.4 公共 SSE 解析 (`backend/src/lib/ai/sse.ts` — 新增)

从 `aiController.ts` 的 `streamChat` 和 `agentExecute` 中提取公共 SSE 流写入逻辑：

```typescript
function writeSSEEvent(res: Response, event: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function handleClientDisconnect(req: Request, abortController: AbortController): void {
  req.on('close', () => abortController.abort());
}
```

---

## 第二节：编辑器深度集成

### 2.1 EditorCommandBus — 消息总线 (`frontend/src/components/EditorCommandBus.tsx`)

React Context + useReducer 模式的消息总线，负责 CodeEditor 和 AI 组件之间的双向通信。

```typescript
interface EditorCommand {
  type: 'goto' | 'diff' | 'replace' | 'focus' | 'agent_start' | 'agent_done';
  payload: Record<string, unknown>;
}

interface EditorEvent {
  type: 'ctrl_k_prompt' | 'selection_changed' | 'file_opened' | 'agent_abort';
  payload: Record<string, unknown>;
}

// Context 提供
const EditorCommandContext = createContext<{
  emitCommand: (cmd: EditorCommand) => void;
  onEvent: (handler: (event: EditorEvent) => void) => () => void;
  agentState: 'idle' | 'running' | 'diff_preview';
} | null>(null);
```

**命令类型：**

| 命令 | 方向 | 效果 |
|------|------|------|
| `goto(file, line, column)` | Agent→Editor | 编辑器切换文件并跳转到指定行列 |
| `diff(file, old, new)` | Agent→Editor | Monaco DiffEditor 内联展示变更 |
| `replace(file, range, text)` | Agent→Editor | 编辑器内直接替换文本 |
| `focus()` | Agent→Editor | 编辑器获得焦点 |
| `agent_start()` | Agent→Editor | 编辑器进入 agent_running 状态 |
| `agent_done()` | Agent→Editor | 编辑器回到 idle 状态 |
| `ctrl_k_prompt(text)` | Editor→Agent | 用户 Ctrl+K 输入内容 |
| `selection_changed(text, range)` | Editor→Agent | 选中文本变化通知 |
| `file_opened(fileId)` | Editor→Agent | 用户打开新文件通知 |
| `agent_abort()` | Editor→Agent | 用户请求中止 Agent |

### 2.2 GhostTextProvider 升级 (`frontend/src/components/GhostTextProvider.tsx`)

**改进项：**

| 维度 | 当前 | 新 |
|------|------|------|
| 去抖 | 无 | 800ms 防抖 |
| 上下文 | 前 500 行 + 后 100 行 | token 预算限制（前 4000 token + 后 1000 token） |
| 请求取消 | 新请求 abort 旧请求 | abort + 如光标已移动超过 10 字符则丢弃结果 |
| 格式 | 单行纯文本 | 同语言多行补全，保持缩进 |
| 接受 | Tab | Tab + 状态栏提示"AI 建议可用" |
| 深色模式 | 无感知 | 跟随编辑器主题 |

### 2.3 InlinePrompt (Ctrl+K) 升级

```
[当前]
  Ctrl+K → 输入文本 → streamChat → 结果展示在浮动面板 → 用户手动处理

[新]
  Ctrl+K → 输入文本 → agentExecute (Agent 模式，AIPanel 隐藏)
         → Agent 自主规划+读文件+搜索+写文件
         → 变更通过 EditorCommandBus 以 DiffEditor 逐个展示
         → 用户逐个接受/拒绝（快捷键 ⌘Y / ⌘N / →）
         → 完成 → 编辑器回到 idle
```

- Agent 执行过程中，编辑器右上角显示旋转指示器
- 支持中途取消（Esc 或点击指示器）
- 取消后保留已完成的部分结果（不会丢失 Agent 已做的工作）

### 2.4 InlineAIMenu 升级 (`frontend/src/components/InlineAIMenu.tsx`)

- **fix 操作**：调用 streamChat 获取修复结果 → Monaco DiffEditor 内联展示 → 接受后替换编辑器中的选中代码
- **explain 操作**：结果显示在浮动面板中，代码片段可点击跳转到编辑器对应位置
- **所有操作**：完成后通过 `EditorCommandBus.emitCommand({type: 'replace', ...})` 将结果写回编辑器
- 菜单位置智能边界检测：`top`/`left`/`right`/`bottom` 四方向动态调整，防止超出视口
- 操作切换时清除上次状态，防止残留

### 2.5 InlineDiffEditor (`frontend/src/components/InlineDiffEditor.tsx` — 新增)

使用 Monaco DiffEditor（非手动实现的 SimpleDiff），在编辑器底部滑出面板（高度 40%）展示 AI 生成的文件变更。

```typescript
interface InlineDiffEditorProps {
  filePatch: FilePatch;
  monaco: typeof import('monaco-editor');
  theme: 'light' | 'dark';
  onAccept: (filePath: string) => void;
  onReject: (filePath: string) => void;
  onSkip: () => void;
  onAcceptAll: () => void;
}
```

- 键盘快捷键：⌘Y 接受当前 / ⌘N 拒绝当前 / → 下一个 / ⌘Shift+Y 全接受
- 每个文件补丁独立展示，用户逐个确认
- 接受 → 发送 write_file 请求到后端，回写到数据库
- 拒绝 → 仅丢弃 diff，不修改文件
- 深色模式完整支持

---

## 第三节：推理可视化 & Diff 预览升级

### 3.1 AgentThinking 升级 (`frontend/src/components/AgentThinking.tsx`)

**新增特性：**
- **流式 thinking**：模型输出 thinking 块时实时渲染（打字机效果）
- **工具调用卡片**：含 toolName、文件路径（可点击 → EditorCommandBus.goto）、耗时、token 消耗
- **状态动画**：running 脉冲动画（`animate-pulse`）、completed 绿色对勾 + Yohaku success 色、error 红色叉号 + Yohaku error 色
- **分组折叠**：连续同类型工具调用自动折叠（如连续读 5 个文件 → "读取 5 个文件"可展开）
- **pending 状态可见**：之前 pending 时不显示任何指示，新设计用灰色时钟图标 + "等待中"文本
- **工具图标统一**：使用 lucide-react 的 Search/FileText/FileEdit/Terminal/Globe/AlertTriangle 等图标
- **自动滚动**：工具调用卡片区域跟随最新事件

### 3.2 FilePatchPreview 升级 (`frontend/src/components/FilePatchPreview.tsx`)

```
[当前] 手动 SimpleDiff，逐行对比，硬编码红绿色

[新] Monaco DiffEditor 集成
┌──────────────────────────────────────────────────┐
│ 📄 src/components/Header.tsx        [接受] [拒绝] │
├──────────────────────────────────────────────────┤
│  ┌──────────┬──────────────────────────────────┐ │
│  │  旧代码   │  新代码                           │ │
│  │  45 │... │  45 │  import { cn }   [绿色高亮] │ │
│  │  46 │... │     │                  [红色删除] │ │
│  │  47 │... │  46 │  const Header =  [不变行]   │ │
│  └──────────┴──────────────────────────────────┘ │
│                                                   │
│  快捷键: ⌘Y 接受  ⌘N 拒绝  → 下一个               │
└──────────────────────────────────────────────────┘
```

**改进项：**
- 使用 Monaco DiffEditor（LCS 算法，专业 diff 引擎）
- 接受按钮发送实际文件写入请求到后端
- 拒绝按钮丢弃 diff
- 快捷键支持（沿用 InlineDiffEditor 一致）
- 全接受/全拒绝按钮
- 修复 SimpleDiff 的 `oldContent=""` 导致全绿问题
- 深色模式完整支持

---

## 第四节：工具生态 & 上下文升级

### 4.1 上下文感知升级 (`backend/src/lib/ai/context.ts`)

**改进项：**

| 维度 | 当前 | 新 |
|------|------|------|
| 文件加载 | 全量加载所有文件 | 文件树分页懒加载（首批 200 条） |
| 关联文件 | 仅当前文件 + 选中文件 | 当前文件 + 同目录兄弟文件(10个) + import 依赖(单层) + 最近编辑(5个) |
| token 估算 | 粗略 text.length/4 | tiktoken (gpt-4o 分词器，`js-tiktoken` 库) |
| 上下文裁剪 | 简单截断 | 按优先级裁剪：当前文件 > 依赖 > 同目录 > 文件树摘要 |
| token 预算 | 12K | 32K（可配置 `MAX_CONTEXT_TOKENS`） |
| 当前文件 | 不截断 | 最大 16K tokens，超出截断 |

**新增：`buildContextSystemPrompt` 避免与 agent system prompt 重复**
- context prompt 结尾加 `[以上为项目上下文信息。现在开始执行用户任务。]`

### 4.2 aiStore 重构 (`frontend/src/stores/aiStore.ts`)

拆分为三个 slice，合并在一个 Zustand store 中（使用 immer 中间件）：

```typescript
interface AIStore {
  // agent slice
  agent: {
    isAgentMode: boolean;
    thinkingContent: string;
    toolCalls: AgentToolCall[];
    filePatches: FilePatch[];
    loopCount: number;
    isExecuting: boolean;
    abortController: AbortController | null;
    actions: {
      setAgentMode: (mode: boolean) => void;
      appendThinking: (chunk: string) => void;
      resetThinking: () => void;
      addToolCall: (call: AgentToolCall) => void;
      updateToolCall: (id: string, updates: Partial<AgentToolCall>) => void;
      addFilePatch: (patch: FilePatch) => void;
      acceptFilePatch: (filePath: string) => void;
      rejectFilePatch: (filePath: string) => void;
      incrementLoop: () => void;
      setExecuting: (exec: boolean) => void;
      setAbortController: (ctrl: AbortController | null) => void;
      resetAgent: () => void;
    };
  };
  
  // chat slice
  chat: {
    conversations: AIConversation[];
    activeConversationId: string | null;
    messages: AIMessage[];
    isStreaming: boolean;
    streamContent: string;
    selectedModel: string;
    contextFiles: string[];
    actions: {
      setConversations: (list: AIConversation[]) => void;
      setActiveConversation: (id: string | null) => void;
      addConversation: (conv: AIConversation) => void;
      removeConversation: (id: string) => void;
      addMessage: (msg: AIMessage) => void;
      setMessages: (msgs: AIMessage[]) => void;
      appendStreamContent: (chunk: string) => void;
      resetStreamContent: () => void;
      toggleContextFile: (fileId: string) => void;
      setStreaming: (s: boolean) => void;
      setSelectedModel: (model: string) => void;
    };
  };
  
  // editor slice (new)
  editor: {
    activeFileId: string | null;
    editorState: 'idle' | 'agent_running' | 'diff_preview';
    diffFiles: DiffFile[];
    inlineCommand: string | null;
    actions: {
      setActiveFile: (fileId: string | null) => void;
      setEditorState: (state: 'idle' | 'agent_running' | 'diff_preview') => void;
      addDiffFile: (file: DiffFile) => void;
      removeDiffFile: (filePath: string) => void;
      clearDiffFiles: () => void;
      setInlineCommand: (cmd: string | null) => void;
    };
  };
}
```

使用 immer 中间件：`create(immer<AIStore>(...))`

### 4.3 SSE 公共解析 (`frontend/src/lib/ai.ts`)

从 `streamChat` 和 `agentExecute` 中提取公共 SSE 流读取逻辑：

```typescript
async function parseSSEStream<T extends SSEEvent>(
  response: Response,
  onEvent: (event: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      
      try {
        const data = JSON.parse(trimmed.slice(6));
        onEvent(data as T);
      } catch {
        continue;
      }
    }
  }
}
```

---

## 第五节：错误处理 & 韧性

### 5.1 全链路错误分类

```typescript
type AIErrorType = 'auth' | 'rate_limit' | 'server' | 'timeout' | 'network' | 'abort' | 'unknown';

interface AIError {
  type: AIErrorType;
  retryable: boolean;
  message: string;
  suggestion?: string;  // 用户操作建议
}
```

**前端错误处理策略：**

| 错误类型 | UI 展示 | 重试策略 |
|---------|---------|---------|
| auth (401/403) | 横幅提示"API Key 无效或已过期"，附跳转设置链接 | 不重试 |
| rate_limit (429) | 横幅提示"请求太频繁"，显示等待秒数 | 指数退避（1s→2s→4s→8s），最多 3 次 |
| server (5xx) | Toast 提示"服务器错误"，附重试按钮 | 最多重试 1 次 |
| timeout | Toast 提示"请求超时"，附重试按钮 | 最多重试 1 次 |
| abort | 静默（用户主动取消） | 不重试 |
| network | Toast 提示"网络错误，请检查连接" | 不重试 |

### 5.2 心跳检测与自动恢复

- Agent 执行期间，前端每 5 秒检测 SSE 连接状态
- 如果断连但 Agent 任务仍在后端运行，通过轮询 `/api/ai/conversations/:id` 恢复连接
- 恢复后发送 `resume` 信号，后端从断点继续 streaming

### 5.3 取消机制

- 前端通过 AbortController 取消 fetch 请求
- 后端通过 AbortSignal 停止 Agent 循环
- 后端通过 `POST /api/ai/agent/abort` 主动中止
- 取消后保存已完成的消息历史（不丢弃 Agent 已完成的工作）

---

## 第六节：类型系统清理

### 6.1 后端类型修复

- `tools.ts`：移除未使用的 `ToolCall` 和 `ToolResult` 类型；`DANGEROUS_COMMANDS_PATTERNS` 连接给 execute_command
- `agent.ts`：移除 `teamConfig as any`；移除第 144-147 行不可达代码
- `aiController.ts`：修复 `toolCalls: {}` → `[]`；使用 `classifyError` 统一错误处理
- `context.ts`：`estimateTokens` 改用 `js-tiktoken` 库

### 6.2 前端类型修复

- `AIPanel.tsx`：移除 `as any` 类型断言；`addMessage` 参数使用 `Partial<AIMessage>`；`copied` 改为 `Map<string, boolean>`
- `AgentThinking.tsx`：`FilePatchActions` 的 `filePatches` 类型与 `aiStore` 对齐
- `GhostTextProvider.tsx`：Monaco 类型明确导入（`editor.IStandaloneCodeEditor`, `languages.InlineCompletionsProvider`）

---

## 实施顺序

| 阶段 | 内容 | 预估文件数 |
|------|------|-----------|
| 1. 后端引擎 | AgentLoop 升级 + 工具扩展 + 控制器修复 + SSE 公共提取 | 5-6 文件 |
| 2. 前端 Store | aiStore 重构 (immer + 3 slices) + ai.ts SSE 公共解析 | 2 文件 |
| 3. 编辑器集成 | EditorCommandBus + GhostText升级 + InlinePrompt升级 + InlineAIMenu升级 + InlineDiffEditor | 5-6 文件 |
| 4. 推理可视化 | AgentThinking升级 + FilePatchPreview升级 (Monaco DiffEditor) | 2-3 文件 |
| 5. AIPanel 重写 | 全面重构 AIPanel，集成所有新组件 | 1 文件 |
| 6. 错误处理 | 全链路错误分类 + 心跳检测 + 取消机制 | 2-3 文件 |
| 7. 清理验证 | 类型系统清理 + 死代码移除 + 前后端构建验证 | 全局 |
