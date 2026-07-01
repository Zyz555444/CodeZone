import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '../prisma';
import { logger } from '../../utils/logger';
import type { ToolDefinition, ToolExecutionResult, AgentContext } from './types';

const execAsync = promisify(exec);

export type ToolHandler = (
  args: Record<string, unknown>,
  context: AgentContext,
) => Promise<ToolExecutionResult>;

interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
  requiresConfirm: boolean;
}

const tools = new Map<string, RegisteredTool>();

const DANGEROUS_COMMANDS_PATTERNS = [
  /\brm\s+-rf\b/,
  /\bshutdown\b/,
  /\breboot\b/,
  /\bpoweroff\b/,
  /\bfdisk\b/,
  /\bparted\b/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
  /\b:(){ :|:& };:/,
  /\bgit\s+push\s+.*--force\b/,
  /\bdocker\s+rm\b/,
  /\bdocker\s+rmi\b/,
  /\bdocker\s+system\s+prune\b/,
  /\bchmod\s+777\b/,
  /\bchown\s+-R\b/,
  /\buseradd\b/,
  /\bpasswd\b/,
];

function isDangerousCommand(command: string): string | null {
  const normalized = command.trim().toLowerCase();
  for (const pattern of DANGEROUS_COMMANDS_PATTERNS) {
    if (pattern.test(normalized)) {
      return `命令被安全策略拦截: ${pattern}`;
    }
  }
  return null;
}

function registerTool(def: ToolDefinition, handler: ToolHandler, requiresConfirm = false): void {
  tools.set(def.function.name, { definition: def, handler, requiresConfirm });
}

export function getToolDefinitions(): ToolDefinition[] {
  return Array.from(tools.values()).map((t) => t.definition);
}

export function isConfirmRequired(name: string): boolean {
  return tools.get(name)?.requiresConfirm ?? false;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: AgentContext,
): Promise<ToolExecutionResult> {
  const tool = tools.get(name);
  if (!tool) {
    return { success: false, output: '', error: `未知工具: ${name}` };
  }
  try {
    return await tool.handler(args, context);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '工具执行失败';
    logger.error(`Tool ${name} execution error:`, msg);
    return { success: false, output: '', error: msg };
  }
}

async function readFileHandler(
  args: Record<string, unknown>,
  context: AgentContext,
): Promise<ToolExecutionResult> {
  const filePath = args.filePath as string | undefined;
   const offset = (args.offset as number) ?? 0;
   const limit = Math.min((args.limit as number) ?? 200, 200);

  if (!filePath) {
    return { success: false, output: '', error: 'filePath 参数必填' };
  }

  let file;
  if (filePath.startsWith('codefile:')) {
    const fid = filePath.replace('codefile:', '');
    file = await prisma.codeFile.findFirst({
      where: { id: fid, projectId: context.projectId },
      select: { name: true, content: true },
    });
  } else {
    file = await prisma.codeFile.findFirst({
      where: {
        projectId: context.projectId,
        OR: [{ path: filePath }, { name: filePath }],
      },
      orderBy: { path: 'asc' },
      select: { name: true, content: true, path: true },
    });
  }

  if (!file) {
    return { success: false, output: '', error: `文件不存在: ${filePath}` };
  }

  const content = file.content || '';
  const lines = content.split('\n');
  const sliced = lines.slice(offset, offset + limit);
  const result = sliced.join('\n');
  const displayPath = (file as { path?: string }).path || file.name;

  let output = `File: ${displayPath} (lines ${offset + 1}-${offset + sliced.length} of ${lines.length})\n\`\`\`\n${result}\n\`\`\``;
  if (sliced.length < lines.length) {
    output += `\n(Showing ${sliced.length} of ${lines.length} lines. Use offset=${offset + limit} to read more.)`;
  }

  return { success: true, output };
}

async function writeFileHandler(
  args: Record<string, unknown>,
  context: AgentContext,
): Promise<ToolExecutionResult> {
  const filePath = args.filePath as string | undefined;
  const content = args.content as string | undefined;

  if (!filePath || content === undefined) {
    return { success: false, output: '', error: 'filePath 和 content 参数必填' };
  }

  if (content.length > 100000) {
    return { success: false, output: '', error: '文件内容超过 100KB 限制' };
  }

  const existing = await prisma.codeFile.findFirst({
    where: {
      projectId: context.projectId,
      OR: [{ path: filePath }, { name: filePath }],
    },
  });

  if (existing) {
    const oldContent = existing.content || '';
    await prisma.codeFile.update({
      where: { id: existing.id },
      data: { content },
    });
    return {
      success: true,
      output: `文件已更新: ${filePath}\n${content.split('\n').length} 行已写入。`,
      oldContent,
      fileId: existing.id,
    };
  }

  const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
  let parentId: string | null = null;

  if (folderPath && folderPath !== '') {
    const parent = await prisma.codeFile.findFirst({
      where: { projectId: context.projectId, path: folderPath, type: 'DIRECTORY' },
    });
    parentId = parent?.id || null;
  }

  const name = filePath.substring(filePath.lastIndexOf('/') + 1);
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : '';

  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
    css: 'css', html: 'html', json: 'json', md: 'markdown', sql: 'sql',
    yml: 'yaml', yaml: 'yaml', xml: 'xml', sh: 'bash', bash: 'bash',
  };

  const created = await prisma.codeFile.create({
    data: {
      name,
      path: filePath,
      content,
      type: 'FILE',
      language: langMap[ext] || 'plaintext',
      projectId: context.projectId,
      parentId,
    },
  });

  return {
    success: true,
    output: `文件已创建: ${filePath} (id: ${created.id})\n${content.split('\n').length} 行已写入。`,
    oldContent: '',
    fileId: created.id,
  };
}

async function replaceInFileHandler(
  args: Record<string, unknown>,
  context: AgentContext,
): Promise<ToolExecutionResult> {
  const filePath = args.filePath as string | undefined;
  const oldString = args.oldString as string | undefined;
  const newString = args.newString as string | undefined;

  if (!filePath || oldString === undefined || newString === undefined) {
    return { success: false, output: '', error: 'filePath, oldString, newString 参数必填' };
  }

  const file = await prisma.codeFile.findFirst({
    where: {
      projectId: context.projectId,
      OR: [{ path: filePath }, { name: filePath }],
    },
    select: { id: true, content: true, path: true },
  });

  if (!file) {
    return { success: false, output: '', error: `文件不存在: ${filePath}` };
  }

  const content = file.content || '';

  const indices: number[] = [];
  let pos = content.indexOf(oldString);
  while (pos !== -1) {
    indices.push(pos);
    pos = content.indexOf(oldString, pos + 1);
  }

  if (indices.length === 0) {
    return { success: false, output: '', error: `在文件 "${filePath}" 中未找到匹配的 oldString。请检查字符串是否完全匹配（含缩进和空格）。` };
  }

  if (indices.length > 1) {
    const locations = indices.map((i) => {
      const lineNum = content.slice(0, i).split('\n').length;
      const preview = content.slice(i, i + 80).replace(/\n/g, '\\n');
      return `  行 ${lineNum}: ...${preview}...`;
    }).join('\n');
    return {
      success: false,
      output: '',
      error: `oldString 在文件中匹配了 ${indices.length} 处，请提供更精确的字符串以确保唯一匹配:\n${locations}`,
    };
  }

  const updatedContent = content.replace(oldString, newString);

  await prisma.codeFile.update({
    where: { id: file.id },
    data: { content: updatedContent },
  });

  const oldLines = oldString.split('\n').length;
  const newLines = newString.split('\n').length;
  const lineNum = content.slice(0, indices[0]).split('\n').length;

  return {
    success: true,
    output: `文件已修改: ${filePath}\n替换了第 ${lineNum} 行的 ${oldLines} 行为 ${newLines} 行。`,
    oldContent: content,
    fileId: file.id,
  };
}

async function grepFilesHandler(
  args: Record<string, unknown>,
  context: AgentContext,
): Promise<ToolExecutionResult> {
  const pattern = args.pattern as string | undefined;
  const path = args.path as string | undefined;
  const maxResults = Math.min((args.maxResults as number) || 50, 50);

  if (!pattern) {
    return { success: false, output: '', error: 'pattern 参数必填' };
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, 'i');
  } catch {
    return { success: false, output: '', error: `无效的正则表达式: ${pattern}` };
  }

  const where: Record<string, unknown> = {
    projectId: context.projectId,
    type: 'FILE',
  };
  if (path) {
    where.path = { startsWith: path };
  }

  const files = await prisma.codeFile.findMany({
    where: where as Record<string, unknown>,
    select: { id: true, name: true, path: true, content: true },
    take: 200,
  });

  const results: string[] = [];

  for (const file of files) {
    if (results.length >= maxResults) break;
    if (!file.content) continue;

    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (results.length >= maxResults) break;
      if (regex.test(lines[i])) {
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length, i + 3);
        const snippet = lines
          .slice(start, end)
          .map((l: string, idx: number) => `${start + idx + 1}: ${l}`)
          .join('\n');
        const filePath = file.path || file.name;
        results.push(`${filePath}:${i + 1}\n\`\`\`\n${snippet}\n\`\`\``);
      }
    }
  }

  if (results.length === 0) {
    return { success: true, output: `在 ${files.length} 个文件中未找到匹配 "${pattern}" 的结果。` };
  }

  return { success: true, output: `找到 ${results.length} 个匹配:\n\n${results.join('\n\n')}` };
}

async function globFilesHandler(
  args: Record<string, unknown>,
  context: AgentContext,
): Promise<ToolExecutionResult> {
  const pattern = args.pattern as string | undefined;
  const maxResults = Math.min((args.maxResults as number) || 200, 200);

  if (!pattern) {
    return { success: false, output: '', error: 'pattern 参数必填' };
  }

  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '[[GLOBSTAR]]')
    .replace(/\*/g, '[^/]*')
    .replace(/\[\[GLOBSTAR\]\]/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\[!/g, '[^');

  let regex: RegExp;
  try {
    regex = new RegExp(`^${regexStr}$`, 'i');
  } catch {
    return { success: false, output: '', error: `无效的 glob 模式: ${pattern}` };
  }

  const files = await prisma.codeFile.findMany({
    where: { projectId: context.projectId },
    select: { id: true, name: true, path: true, type: true, language: true },
    take: 500,
  });

  const matched = files.filter((f: { path: string; name: string }) => {
    const p = f.path || f.name;
    return regex.test(p);
  });

  const limited = matched.slice(0, maxResults);

  if (limited.length === 0) {
    return { success: true, output: `未找到匹配 "${pattern}" 的文件。` };
  }

  const tree = limited.map((f: { type: string; language: string | null; path: string; name: string }) => {
    const icon = f.type === 'DIRECTORY' ? '[DIR]' : `[${f.language || 'file'}]`;
    return `${icon} ${f.path || f.name}`;
  });

  return { success: true, output: `找到 ${limited.length} 个文件:\n${tree.join('\n')}${matched.length > maxResults ? `\n\n(结果已截断，共匹配 ${matched.length} 个文件)` : ''}` };
}

async function searchCodeHandler(
  args: Record<string, unknown>,
  context: AgentContext,
): Promise<ToolExecutionResult> {
  const query = args.query as string | undefined;
  const include = args.include as string | undefined;
  const maxResults = Math.min((args.maxResults as number) || 10, 20);

  if (!query) {
    return { success: false, output: '', error: 'query 参数必填' };
  }

  if (query.length > 500) {
    return { success: false, output: '', error: '搜索查询超过 500 字符限制' };
  }

  const files = await prisma.codeFile.findMany({
    where: {
      projectId: context.projectId,
      type: 'FILE',
      ...(include ? {
        OR: [
          { name: { contains: include, mode: 'insensitive' } },
          { path: { contains: include, mode: 'insensitive' } },
        ],
      } : {}),
    },
    select: { id: true, name: true, path: true, content: true },
    take: 200,
  });

  const results: string[] = [];
  const fileContents = files
    .filter((f: { content: string | null }) => f.content && f.content.length < 50000);

  for (const file of fileContents) {
    if (results.length >= maxResults) break;
    const lines = file.content!.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (results.length >= maxResults) break;
      if (lines[i].toLowerCase().includes(query.toLowerCase())) {
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length, i + 3);
        const snippet = lines.slice(start, end)
          .map((l: string, idx: number) => `${start + idx + 1}: ${l}`)
          .join('\n');
        results.push(`${file.path || file.name}:${i + 1}\n\`\`\`\n${snippet}\n\`\`\``);
      }
    }
  }

  if (results.length === 0) {
    return { success: true, output: `在 ${fileContents.length} 个文件中未找到匹配 "${query}" 的结果。` };
  }

  return { success: true, output: `找到 ${results.length} 个匹配:\n\n${results.join('\n\n')}` };
}

async function listFilesHandler(
  args: Record<string, unknown>,
  context: AgentContext,
): Promise<ToolExecutionResult> {
  const filePath = (args.path as string) || '';

  const where: Record<string, unknown> = { projectId: context.projectId };
  if (filePath) {
    where.path = { startsWith: filePath };
  }

  const files = await prisma.codeFile.findMany({
    where: where as Record<string, unknown>,
    select: { id: true, name: true, path: true, type: true, language: true },
    orderBy: [{ type: 'asc' }, { path: 'asc' }],
    take: 200,
  });

  if (files.length === 0) {
    return { success: true, output: filePath ? `目录 "${filePath}" 为空。` : '项目中没有文件。' };
  }

  const tree = files.map((f: { type: string; language: string | null; path: string; name: string }) => {
    const icon = f.type === 'DIRECTORY' ? '[DIR]' : `[${f.language || 'file'}]`;
    return `${icon} ${f.path || f.name}`;
  });

  return { success: true, output: `${files.length} 个文件:\n${tree.join('\n')}` };
}

async function executeCommandHandler(
  args: Record<string, unknown>,
  _context: AgentContext,
): Promise<ToolExecutionResult> {
  const command = args.command as string | undefined;
  const workdir = (args.workdir as string) || '/workspace';

  if (!command) {
    return { success: false, output: '', error: 'command 参数必填' };
  }

  const dangerCheck = isDangerousCommand(command);
  if (dangerCheck) {
    return { success: false, output: '', error: dangerCheck };
  }

  try {
     const { stdout, stderr } = await execAsync(command, {
       cwd: workdir,
       timeout: 30000,
       maxBuffer: 200 * 1024,
     });

     const output = stdout + (stderr ? `\n[stderr]\n${stderr}` : '');
     const truncated = output.length > 200000 ? output.slice(0, 200000) + '\n...输出已截断 (200KB限制)' : output;

    return { success: true, output: truncated || '(命令执行成功，无输出)' };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
    if (err.killed) {
      return { success: false, output: '', error: '命令执行超时 (30s)' };
    }
    const errorOutput = (err.stdout || '') + (err.stderr || '');
    const msg = err.message || '命令执行失败';
    return { success: false, output: errorOutput, error: msg };
  }
}

async function webFetchHandler(
  args: Record<string, unknown>,
  _context: AgentContext,
): Promise<ToolExecutionResult> {
  const url = args.url as string | undefined;

  if (!url) {
    return { success: false, output: '', error: 'url 参数必填' };
  }

  if (!url.startsWith('https://')) {
    return { success: false, output: '', error: '仅支持 HTTPS URL' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CodeZone-AI-Agent/1.0',
        'Accept': 'text/html,text/plain,application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, output: '', error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const text = await response.text();
    const truncated = text.slice(0, 100 * 1024);

    if (truncated.length < text.length) {
      return { success: true, output: truncated + '\n\n...内容已截断 (100KB限制)' };
    }

    return { success: true, output: truncated };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, output: '', error: '请求超时 (15s)' };
    }
    const msg = error instanceof Error ? error.message : '获取失败';
    return { success: false, output: '', error: msg };
  }
}

async function readLintsHandler(
  args: Record<string, unknown>,
  _context: AgentContext,
): Promise<ToolExecutionResult> {
  const filePath = args.path as string | undefined;

   if (filePath) {
     if (!/^[a-zA-Z0-9_\-/.]+$/.test(filePath)) {
       return { success: false, output: '', error: '路径包含非法字符，只允许字母、数字、下划线、连字符、点和斜杠' };
     }
     if (filePath.includes('..')) {
       return { success: false, output: '', error: '路径禁止包含目录穿越序列 (..)' };
     }
   }

  try {
    const cwd = '/workspace';
    let results = '';

    const eslintArgs = filePath ? filePath : 'src/ --ext .ts,.tsx,.js,.jsx';
    try {
      const { stdout } = await execAsync(`cd ${cwd}/frontend && npx eslint ${eslintArgs} --format compact 2>&1 || true`, {
        cwd,
        timeout: 30000,
        maxBuffer: 50 * 1024,
      });
      if (stdout.trim()) {
        results += `## ESLint\n${stdout.trim()}\n\n`;
      }
    } catch {
      // eslint not available or no errors
    }

    try {
      const { stdout } = await execAsync(`cd ${cwd}/backend && npx tsc --noEmit 2>&1 || true`, {
        cwd,
        timeout: 30000,
        maxBuffer: 50 * 1024,
      });
      if (stdout.trim()) {
        results += `## TypeScript\n${stdout.trim()}`;
      }
    } catch {
      // tsc not available
    }

    if (!results.trim()) {
      return { success: true, output: '未发现 lint 错误。' };
    }

    return { success: true, output: results.slice(0, 50000) };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '读取 lint 信息失败';
    return { success: false, output: '', error: msg };
  }
}

// Register all tools
registerTool(
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a file from the project. Use filePath to specify the path. Optionally specify offset (line number, 0-based) and limit (max 200 lines).',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'File path or name within the project' },
          offset: { type: 'number', description: 'Line number to start reading from (0-based)' },
          limit: { type: 'number', description: 'Maximum number of lines to read (max 200)' },
        },
        required: ['filePath'],
      },
    },
  },
  readFileHandler,
);

registerTool(
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write or create a file in the project. Provide complete filePath and content.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'File path within the project' },
          content: { type: 'string', description: 'Complete file content to write' },
        },
        required: ['filePath', 'content'],
      },
    },
  },
  writeFileHandler,
  true,
);

registerTool(
  {
    type: 'function',
    function: {
      name: 'replace_in_file',
      description: 'Perform exact string replacement in a file. The oldString must match exactly one occurrence in the file. Preferred for targeted edits over write_file.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'File path within the project' },
          oldString: { type: 'string', description: 'The exact string to replace (must match exactly, including whitespace and indentation)' },
          newString: { type: 'string', description: 'The replacement string' },
        },
        required: ['filePath', 'oldString', 'newString'],
      },
    },
  },
  replaceInFileHandler,
  true,
);

registerTool(
  {
    type: 'function',
    function: {
      name: 'search_code',
      description: 'Search for text or code within project files. Case-insensitive substring matching. Returns matching file paths and line numbers with surrounding context.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text to search for (case-insensitive substring match)' },
          include: { type: 'string', description: 'Optional file path filter' },
          maxResults: { type: 'number', description: 'Maximum number of results (default 10, max 20)' },
        },
        required: ['query'],
      },
    },
  },
  searchCodeHandler,
);

registerTool(
  {
    type: 'function',
    function: {
      name: 'grep_files',
      description: 'Search using regular expressions across project files. Returns matching lines with 2 lines of context before and after.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regular expression pattern (case-insensitive)' },
          path: { type: 'string', description: 'Optional directory or file path prefix to limit search scope' },
          maxResults: { type: 'number', description: 'Maximum number of results (default 50, max 50)' },
        },
        required: ['pattern'],
      },
    },
  },
  grepFilesHandler,
);

registerTool(
  {
    type: 'function',
    function: {
      name: 'glob_files',
      description: 'Find files matching a glob pattern. Supports *, **, ?, and character classes.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern, e.g. "src/**/*.ts" or "**/__tests__/*.test.ts"' },
          maxResults: { type: 'number', description: 'Maximum number of results (default 200, max 200)' },
        },
        required: ['pattern'],
      },
    },
  },
  globFilesHandler,
);

registerTool(
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List files and directories in the project. Optionally filter by path prefix.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Optional directory path to list' },
        },
        required: [],
      },
    },
  },
  listFilesHandler,
);

registerTool(
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Execute a terminal command. Dangerous commands (rm -rf, shutdown, etc.) are blocked. 30s timeout, 50KB output limit.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute' },
          workdir: { type: 'string', description: 'Working directory (default: /workspace)' },
        },
        required: ['command'],
      },
    },
  },
  executeCommandHandler,
  true,
);

registerTool(
  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'Fetch content from an HTTPS URL. Returns text content. 15s timeout, 100KB response limit.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'HTTPS URL to fetch' },
        },
        required: ['url'],
      },
    },
  },
  webFetchHandler,
);

registerTool(
  {
    type: 'function',
    function: {
      name: 'read_lints',
      description: 'Read linter (ESLint) and compiler (TypeScript) diagnostics for the project or a specific file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Optional specific file path to check' },
        },
        required: [],
      },
    },
  },
  readLintsHandler,
);
