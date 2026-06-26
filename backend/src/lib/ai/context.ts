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

const DEFAULT_MAX_TOKENS = 32000;
const FIRST_BATCH_SIZE = 200;
const MAX_CURRENT_FILE_TOKENS = 16000;
const SIBLING_LIMIT = 10;
const RECENT_FILES_LIMIT = 5;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.2);
}

function formatFileTree(files: Array<{ path: string; type: string; language?: string | null }>, indent = ''): string {
  const lines: string[] = [];
  for (const file of files.sort((a, b) => a.path.localeCompare(b.path))) {
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
    select: { id: true, path: true, name: true, type: true, language: true, content: true, parentId: true, updatedAt: true },
    orderBy: { path: 'asc' },
    take: FIRST_BATCH_SIZE,
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
    const currentFile = allFiles.find((f: { id: string; path: string; content: string | null; language: string | null }) => f.id === currentFileId);

    if (currentFile?.content) {
      let content = currentFile.content;
      const contentTokens = estimateTokens(content);

      if (contentTokens > MAX_CURRENT_FILE_TOKENS) {
        content = content.slice(0, MAX_CURRENT_FILE_TOKENS * 3.2) + '\n// ...文件内容已截断';
      }

      context.currentFile = {
        path: currentFile.path,
        content,
        language: currentFile.language || 'text',
      };
      currentTokens += estimateTokens(content);

      const dir = currentFile.path.substring(0, currentFile.path.lastIndexOf('/'));
      if (dir) {
        const siblings = allFiles
          .filter((f: { path: string; type: string; id: string; content: string | null; language: string | null }) => {
            const fDir = f.path.substring(0, f.path.lastIndexOf('/'));
            return fDir === dir && f.id !== currentFile.id && f.type === 'FILE';
          })
          .slice(0, SIBLING_LIMIT);

        for (const sib of siblings) {
          if (sib.content && currentTokens < maxTokens) {
            const sibTokens = estimateTokens(sib.content);
            const truncated = sibTokens > 2000
              ? sib.content.slice(0, 2000 * 3.2) + '\n// ...截断'
              : sib.content;
            context.selectedFiles.push({
              path: sib.path,
              content: truncated,
              language: sib.language || 'text',
            });
            currentTokens += estimateTokens(truncated);
          }
        }
      }
    }
  }

  if (currentFileId) {
    const recentFiles = allFiles
      .filter((f: { id: string; path: string; type: string; content: string | null; language: string | null; updatedAt: Date | null }) => f.id !== currentFileId && f.type === 'FILE' && f.content)
      .sort((a: { updatedAt: Date | null }, b: { updatedAt: Date | null }) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, RECENT_FILES_LIMIT);

    for (const rf of recentFiles) {
      if (currentTokens >= maxTokens) break;
      if (context.selectedFiles.find((sf) => sf.path === rf.path)) continue;

      const rfTokens = estimateTokens(rf.content!);
      const truncated = rfTokens > 2000
        ? rf.content!.slice(0, 2000 * 3.2) + '\n// ...截断'
        : rf.content!;
      context.selectedFiles.push({
        path: rf.path,
        content: truncated,
        language: rf.language || 'text',
      });
      currentTokens += estimateTokens(truncated);
    }
  }

  if (selectedFileIds) {
    const targetTokens = maxTokens - currentTokens;
    if (targetTokens > 0) {
      const perFileBudget = Math.max(500, Math.floor(targetTokens / (selectedFileIds.length || 1)));

      for (const fid of selectedFileIds) {
        if (currentTokens >= maxTokens) break;

        const f = allFiles.find((x: { id: string; path: string; content: string | null; language: string | null }) => x.id === fid);
        if (!f?.content) continue;

        if (context.selectedFiles.find((sf) => sf.path === f.path)) continue;

        const fTokens = estimateTokens(f.content);
        const truncated = fTokens > perFileBudget
          ? f.content.slice(0, perFileBudget * 3.2) + '\n// ...截断'
          : f.content;
        context.selectedFiles.push({
          path: f.path,
          content: truncated,
          language: f.language || 'text',
        });
        currentTokens += estimateTokens(truncated);
      }
    }
  }

  context.estimatedTokens = currentTokens;
  return context;
}

export function buildContextSystemPrompt(context: ProjectContext): string {
  const parts: string[] = [];

  parts.push('## Project File Tree');
  parts.push('```\n' + context.fileTree + '\n```');

  if (context.currentFile) {
    parts.push(`\n## Current Open File: ${context.currentFile.path}`);
    parts.push('```' + context.currentFile.language + '\n' + context.currentFile.content + '\n```');
  }

  if (context.selectedFiles.length > 0) {
    parts.push('\n## Related Files');
    for (const sf of context.selectedFiles) {
      parts.push(`\n### ${sf.path}`);
      parts.push('```' + sf.language + '\n' + sf.content + '\n```');
    }
  }

  parts.push('\n\n[以上为项目上下文信息。现在开始执行用户任务。]');

  return parts.join('\n');
}
