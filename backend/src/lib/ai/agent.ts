import { Message, AgentContext, AgentLoopOptions, AgentStreamEvent, ToolCallRequest, StreamChunk } from './types';
import { aiStreamChat } from './service';
import { collectProjectContext, buildContextSystemPrompt } from './context';
import { getToolDefinitions, executeTool } from './tools';
import { prisma } from '../prisma';
import { logger } from '../../utils/logger';
import { getTeamConfig } from './teamConfigHelper';
import type { AIConfig } from './types';

const MAX_LOOPS = 25;
const MAX_TOOL_OUTPUT_TOKENS = 8000;

const PARALLEL_TOOLS = new Set([
  'read_file',
  'search_code',
  'grep_files',
  'glob_files',
  'list_files',
  'web_fetch',
  'read_lints',
]);

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncateToolOutput(output: string, maxTokens: number): string {
  const currentTokens = estimateTokens(output);
  if (currentTokens <= maxTokens) return output;
  const chars = maxTokens * 4;
  return output.slice(0, chars) + `\n\n[...结果已截断，原始长度 ${currentTokens} tokens]`;
}

function buildAgentSystemPrompt(customInstructions?: string): string {
  let prompt = `You are an AI coding agent integrated into the CodeZone IDE. You help developers write, debug, refactor, and understand code.

## Your Capabilities
You have access to tools to interact with the project file system and run commands:
- **read_file**: Read file contents from the project (supports offset/limit pagination)
- **write_file**: Create or overwrite files in the project
- **replace_in_file**: Perform precise string replacements in files
- **search_code**: Full-text substring search across project files
- **grep_files**: Regular expression search with context lines
- **glob_files**: Find files by glob pattern matching
- **list_files**: List project directory structure
- **execute_command**: Execute terminal commands (requires user confirmation)
- **web_fetch**: Fetch content from HTTPS URLs
- **read_lints**: Read linter/compiler diagnostics

## Critical Rules

### Before Writing Code
1. ALWAYS read the files you plan to modify first
2. ALWAYS search for related code (functions, classes, imports) before making changes
3. Understand the project structure and conventions before proposing changes

### When Writing Code
4. Use write_file for creating NEW files or complete rewrites
5. Use replace_in_file for targeted edits (preferred for small changes)
6. Follow existing code conventions (indentation, naming, patterns)
7. Never write secrets, API keys, or credentials
8. Write complete, working code — no placeholders or TODOs

### Tool Usage
9. Parallelize independent reads — you can read multiple files at once
10. If a tool fails, analyze the error before retrying
11. Prefer search_code/grep_files over reading many individual files
12. For execute_command, explain what the command does and why

### Response Style
13. Be concise and direct — no fluff, no filler
14. Respond in Chinese
15. Reference specific file paths and line numbers
16. When done, summarize what was accomplished

## Safety
- Never execute destructive commands (rm -rf, shutdown, reboot, etc.)
- Never push code or modify git history
- Never expose or log sensitive information`;

  if (customInstructions) {
    prompt += `\n\n## Team Custom Instructions\n${customInstructions}`;
  }

  return prompt;
}

async function buildAgentMessages(
  task: string,
  context: AgentContext,
  history: Message[],
  teamConfig: AIConfig | null,
): Promise<{ messages: Message[]; projectContext?: string }> {
  const messages: Message[] = [];

  const customInstructions = (teamConfig?.parameters as Record<string, unknown>)?.instructions as string | undefined;
  const systemPrompt = buildAgentSystemPrompt(customInstructions);
  messages.push({ role: 'system', content: systemPrompt });

  let projectContext: string | undefined;
  if (context.projectId) {
    const pc = await collectProjectContext(
      context.projectId,
      context.currentFileId,
      context.selectedFileIds,
    );
    const ctxPrompt = buildContextSystemPrompt(pc);
    messages.push({ role: 'system', content: ctxPrompt });
    projectContext = ctxPrompt;
  }

  messages.push(...history);
  messages.push({ role: 'user', content: task });

  return { messages, projectContext };
}

function parseStreamChunkForToolCall(chunk: StreamChunk): ToolCallRequest | null {
  if (chunk.type === 'tool_call' && chunk.tool) {
    return chunk.tool;
  }
  return null;
}

export async function* executeAgentTask(
  task: string,
  context: AgentContext,
  options: AgentLoopOptions = {},
  history: Message[] = [],
): AsyncGenerator<AgentStreamEvent> {
  const maxLoops = options.maxLoops ?? MAX_LOOPS;
  const signal = options.signal;

  const teamConfig = context.teamId ? await getTeamConfig(context.teamId) : null;
  const { messages: initialMessages } = await buildAgentMessages(task, context, history, teamConfig);

  const toolDefs = getToolDefinitions();
  const messages = [...initialMessages];
  if (toolDefs.length > 0 && messages.length > 0) {
    (messages[0] as unknown as Record<string, unknown>).tool_choice = 'auto';
    (messages[0] as unknown as Record<string, unknown>).tools = toolDefs;
  }

  let loopCount = 0;
  let totalTokens = 0;

  while (loopCount < maxLoops) {
    loopCount++;
    if (signal?.aborted) {
      yield { type: 'error', message: '任务已取消' };
      return;
    }

    try {
      const stream = aiStreamChat(messages, {
        temperature: options.temperature ?? 0.5,
        maxTokens: options.maxTokens ?? 4096,
      }, teamConfig);

      let content = '';
      const toolCalls: ToolCallRequest[] = [];

      for await (const chunk of stream) {
        if (signal?.aborted) break;

        if (chunk.type === 'token' && chunk.content) {
          content += chunk.content;
          totalTokens++;
          yield { type: 'token', content: chunk.content };
        } else if (chunk.type === 'tool_call') {
          const tc = parseStreamChunkForToolCall(chunk);
          if (tc) {
            toolCalls.push(tc);
            let args: Record<string, unknown> = {};
            try {
              args = typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : (tc.function.arguments as unknown as Record<string, unknown>) || {};
            } catch { /* parse error, use empty args */ }

            yield {
              type: 'tool_call',
              toolId: tc.id,
              toolName: tc.function.name,
              toolArgs: args,
            };
          }
        } else if (chunk.type === 'error') {
          yield { type: 'error', message: chunk.error || 'AI 服务错误' };
          return;
        }
      }

      if (signal?.aborted) {
        yield { type: 'error', message: '任务已取消' };
        return;
      }

      if (toolCalls.length === 0) {
        messages.push({ role: 'assistant', content });
        yield { type: 'done', totalTokens };
        return;
      }

      messages.push({ role: 'assistant', content, tool_calls: toolCalls });

      const serialTools: ToolCallRequest[] = [];
      const parallelTools: ToolCallRequest[] = [];

      for (const tc of toolCalls) {
        if (PARALLEL_TOOLS.has(tc.function.name)) {
          parallelTools.push(tc);
        } else {
          serialTools.push(tc);
        }
      }

      const executeSingleTool = async (tc: ToolCallRequest): Promise<{ tc: ToolCallRequest; result: { success: boolean; output: string; error?: string } }> => {
        let args: Record<string, unknown> = {};
        try {
          args = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : (tc.function.arguments as unknown as Record<string, unknown>) || {};
        } catch { args = {}; }

        const result = await executeTool(tc.function.name, args, context);
        return { tc, result };
      };

      const handleToolResult = (tc: ToolCallRequest, result: { success: boolean; output: string; error?: string }) => {
        const truncated = truncateToolOutput(
          result.success ? result.output : `Error: ${result.error}`,
          MAX_TOOL_OUTPUT_TOKENS,
        );
        messages.push({
          role: 'tool' as const,
          content: truncated,
          tool_call_id: tc.id,
        });
      };

      if (parallelTools.length > 0) {
        const parallelResults = await Promise.all(
          parallelTools.map(executeSingleTool),
        );

        for (const { tc, result } of parallelResults) {
          if (signal?.aborted) break;

          yield {
            type: 'tool_result',
            toolId: tc.id,
            toolName: tc.function.name,
            toolResult: result.success ? result.output : `Error: ${result.error}`,
          };

          if (tc.function.name === 'write_file' && result.success) {
            let args: Record<string, unknown> = {};
            try {
              args = typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : {};
            } catch { /* ignore */ }
            yield {
              type: 'write_file',
              filePath: (args.filePath as string) || '',
              content: (args.content as string) || '',
            };
          }

          if (signal?.aborted) break;
          handleToolResult(tc, result);
        }
      }

      for (const tc of serialTools) {
        if (signal?.aborted) break;

        const { result } = await executeSingleTool(tc);

        yield {
          type: 'tool_result',
          toolId: tc.id,
          toolName: tc.function.name,
          toolResult: result.success ? result.output : `Error: ${result.error}`,
        };

        if (tc.function.name === 'write_file' && result.success) {
          let args: Record<string, unknown> = {};
          try {
            args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : {};
          } catch { /* ignore */ }
          yield {
            type: 'write_file',
            filePath: (args.filePath as string) || '',
            content: (args.content as string) || '',
          };
        }

        handleToolResult(tc, result);
      }

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Agent 执行失败';
      logger.error('Agent loop error:', msg);
      yield { type: 'error', message: msg };
      return;
    }
  }

  yield { type: 'done', totalTokens };
}

export async function generateConversationTitle(task: string): Promise<string> {
  try {
    const truncated = task.slice(0, 200);
    const stream = aiStreamChat(
      [
        { role: 'system', content: 'You are a title generator. Generate a concise Chinese title (max 15 characters) for a coding task. Return ONLY the title, no quotes, no punctuation.' },
        { role: 'user', content: `Task: ${truncated}\nTitle:` },
      ],
      { temperature: 0.1, maxTokens: 30 },
      null,
    );

    let title = '';
    for await (const chunk of stream) {
      if (chunk.type === 'token' && chunk.content) {
        title += chunk.content;
      }
    }
    return title.trim().slice(0, 30) || 'AI 编码任务';
  } catch {
    return 'AI 编码任务';
  }
}
