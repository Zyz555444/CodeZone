import { prisma } from '../prisma';
import { estimateTokens, truncateByTokens } from './tokens';

interface CodeFileInfo {
  id: string;
  path: string;
  name: string;
  type: string;
  language: string | null;
  content: string | null;
  parentId: string | null;
  updatedAt: Date | null;
}

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

  const allFiles: CodeFileInfo[] = await prisma.codeFile.findMany({
    where: { projectId },
    select: { id: true, path: true, name: true, type: true, language: true, content: true, parentId: true, updatedAt: true },
    orderBy: { path: 'asc' },
    take: FIRST_BATCH_SIZE,
  });

  const missingIds = new Set<string>();
  if (currentFileId && !allFiles.some((f) => f.id === currentFileId)) {
    missingIds.add(currentFileId);
  }
  if (selectedFileIds) {
    for (const fid of selectedFileIds) {
      if (!allFiles.some((f) => f.id === fid)) {
        missingIds.add(fid);
      }
    }
  }
  if (missingIds.size > 0) {
    const extra = await prisma.codeFile.findMany({
      where: { projectId, id: { in: Array.from(missingIds) } },
      select: { id: true, path: true, name: true, type: true, language: true, content: true, parentId: true, updatedAt: true },
    });
    allFiles.push(...extra);
  }

  const fileTree = formatFileTree(allFiles);
  const context: ProjectContext = {
    fileTree,
    selectedFiles: [],
    totalFiles: allFiles.length,
    estimatedTokens: estimateTokens(fileTree),
  };

  let currentTokens = context.estimatedTokens;

  if (currentFileId) {
    const currentFile = allFiles.find((f) => f.id === currentFileId);

    if (currentFile?.content) {
      let content = currentFile.content;
      const contentTokens = estimateTokens(content);

      if (contentTokens > MAX_CURRENT_FILE_TOKENS) {
        content = truncateByTokens(content, MAX_CURRENT_FILE_TOKENS) + '\n// ...文件内容已截断';
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
          .filter((f) => {
            const fDir = f.path.substring(0, f.path.lastIndexOf('/'));
            return fDir === dir && f.id !== currentFile.id && f.type === 'FILE';
          })
          .slice(0, SIBLING_LIMIT);

        for (const sib of siblings) {
          if (sib.content && currentTokens < maxTokens) {
            const sibTokens = estimateTokens(sib.content);
            const truncated = sibTokens > 2000
              ? truncateByTokens(sib.content, 2000) + '\n// ...截断'
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

  const recentFiles = allFiles
    .filter((f) => f.id !== currentFileId && f.type === 'FILE' && f.content)
    .sort((a, b) => {
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
      ? truncateByTokens(rf.content!, 2000) + '\n// ...截断'
      : rf.content!;
    context.selectedFiles.push({
      path: rf.path,
      content: truncated,
      language: rf.language || 'text',
    });
    currentTokens += estimateTokens(truncated);
  }

  if (selectedFileIds) {
    const targetTokens = maxTokens - currentTokens;
    if (targetTokens > 0) {
      const perFileBudget = Math.max(500, Math.floor(targetTokens / (selectedFileIds.length || 1)));

      for (const fid of selectedFileIds) {
        if (currentTokens >= maxTokens) break;

        const f = allFiles.find((x) => x.id === fid);
        if (!f?.content) continue;

        if (context.selectedFiles.find((sf) => sf.path === f.path)) continue;

        const fTokens = estimateTokens(f.content);
        const truncated = fTokens > perFileBudget
          ? truncateByTokens(f.content, perFileBudget) + '\n// ...截断'
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
