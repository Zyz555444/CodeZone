import { prisma } from '../prisma';

interface ProjectContext {
  fileTree: string;
  currentFile?: { path: string; content: string; language: string };
  selectedFiles: Array<{ path: string; content: string; language: string }>;
  totalFiles: number;
  estimatedTokens: number;
}

interface ContextOptions {
  maxTokens?: number;
}

const DEFAULT_MAX_TOKENS = 12000;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatFileTree(files: Array<{ path: string; type: string; language?: string | null }>, indent = ''): string {
  const lines: string[] = [];
  for (const file of files.sort((a, b) => a.path.localeCompare(b.path))) {
    const icon = file.type === 'DIRECTORY' ? '' : '';
    const lang = file.language ? ` (${file.language})` : '';
    lines.push(`${indent}${file.path}${lang}`);
  }
  return lines.join('\n');
}

export async function collectProjectContext(
  projectId: string,
  currentFileId?: string,
  selectedFileIds?: string[],
  options: ContextOptions = {},
): Promise<ProjectContext> {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

  const allFiles = await prisma.codeFile.findMany({
    where: { projectId },
    select: { id: true, path: true, name: true, type: true, language: true, content: true },
    orderBy: { path: 'asc' },
  });

  const fileTree = formatFileTree(allFiles);
  const context: ProjectContext = {
    fileTree,
    selectedFiles: [],
    totalFiles: allFiles.length,
    estimatedTokens: estimateTokens(fileTree),
  };

  let currentTokens = context.estimatedTokens;

  if (currentFileId) {
    const f = allFiles.find((x) => x.id === currentFileId);
    if (f?.content) {
      context.currentFile = {
        path: f.path,
        content: f.content,
        language: f.language || 'text',
      };
      currentTokens += estimateTokens(f.content);
    }
  }

  if (selectedFileIds) {
    const targetTokens = maxTokens - currentTokens;
    const perFileBudget = Math.max(500, Math.floor(targetTokens / selectedFileIds.length));

    for (const fid of selectedFileIds) {
      const f = allFiles.find((x) => x.id === fid);
      if (!f?.content) continue;
      const truncated = estimateTokens(f.content) > perFileBudget
        ? f.content.slice(0, perFileBudget * 4) + '\n// ...truncated'
        : f.content;
      context.selectedFiles.push({
        path: f.path,
        content: truncated,
        language: f.language || 'text',
      });
      currentTokens += estimateTokens(truncated);
      if (currentTokens >= maxTokens) break;
    }
  }

  context.estimatedTokens = currentTokens;
  return context;
}

export function buildContextSystemPrompt(context: ProjectContext): string {
  const parts: string[] = [];

  parts.push(`You are an AI coding agent in the CodeZone platform.`);
  parts.push(`\n## Project File Tree\n\`\`\`\n${context.fileTree}\n\`\`\``);

  if (context.currentFile) {
    parts.push(`\n## Current Open File: ${context.currentFile.path}\n\`\`\`${context.currentFile.language}\n${context.currentFile.content}\n\`\`\``);
  }

  if (context.selectedFiles.length > 0) {
    parts.push(`\n## Additional Selected Files`);
    for (const sf of context.selectedFiles) {
      parts.push(`\n### ${sf.path}\n\`\`\`${sf.language}\n${sf.content}\n\`\`\``);
    }
  }

  parts.push(`\n\nRespond in Chinese. Provide specific, actionable answers referencing project files when relevant.`);

  return parts.join('\n');
}
