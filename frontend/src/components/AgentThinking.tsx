'use client';

import React, { useMemo } from 'react';
import {
  Search, FileText, FileEdit, FolderOpen, Terminal, Globe,
  AlertTriangle, ChevronDown, ChevronRight, Loader2, Check, X, Clock,
} from 'lucide-react';
import { useEditorCommandBus } from '@/components/EditorCommandBus';
import type { useAIStore } from '@/stores/aiStore';

interface ToolCall {
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

interface AgentThinkingProps {
  thinkingContent: string;
  toolCalls: ToolCall[];
  filePatches: FilePatch[];
  onToggleStep: (toolId: string) => void;
  onAcceptFilePatch: (filePath: string) => void;
  onRejectFilePatch: (filePath: string) => void;
}

const toolIcons: Record<string, React.ReactNode> = {
  read_file: <FileText className="h-3.5 w-3.5" />,
  write_file: <FileEdit className="h-3.5 w-3.5" />,
  replace_in_file: <FileEdit className="h-3.5 w-3.5" />,
  search_code: <Search className="h-3.5 w-3.5" />,
  grep_files: <Search className="h-3.5 w-3.5" />,
  glob_files: <Search className="h-3.5 w-3.5" />,
  list_files: <FolderOpen className="h-3.5 w-3.5" />,
  execute_command: <Terminal className="h-3.5 w-3.5" />,
  web_fetch: <Globe className="h-3.5 w-3.5" />,
  read_lints: <AlertTriangle className="h-3.5 w-3.5" />,
};

const toolLabels: Record<string, string> = {
  read_file: '读取文件',
  write_file: '写入文件',
  replace_in_file: '替换内容',
  search_code: '搜索代码',
  grep_files: '正则搜索',
  glob_files: '文件匹配',
  list_files: '列出文件',
  execute_command: '执行命令',
  web_fetch: '网页抓取',
  read_lints: '检查错误',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5 text-neutral-6 shrink-0" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-accent shrink-0" />,
  completed: <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />,
  error: <X className="h-3.5 w-3.5 text-red-500 shrink-0" />,
};

interface ToolGroup {
  toolName: string;
  tools: ToolCall[];
}

function groupConsecutiveCalls(calls: ToolCall[]): ToolGroup[] {
  const groups: ToolGroup[] = [];
  for (const call of calls) {
    const last = groups[groups.length - 1];
    if (last && last.toolName === call.toolName) {
      last.tools.push(call);
    } else {
      groups.push({ toolName: call.toolName, tools: [call] });
    }
  }
  return groups;
}

function formatFileArg(args: Record<string, unknown>): string {
  if (typeof args.filePath === 'string') return args.filePath;
  if (typeof args.path === 'string') return args.path;
  if (typeof args.pattern === 'string') return args.pattern;
  if (typeof args.query === 'string') return args.query;
  if (typeof args.command === 'string') return args.command;
  if (typeof args.url === 'string') return args.url;
  return '';
}

function extractFilePaths(result: string): string[] {
  const paths: string[] = [];
  const re = /(?:^|\s|\n)((?:\/)?[a-zA-Z0-9_\-/.]+\.(?:tsx?|jsx?|ts|js|css|json|html|md|yml|yaml|go|rs|py|rb|java|kt|swift|scala|c|cpp|h|hpp|vue|svelte|astro|prisma|graphql))/gm;
  let match;
  while ((match = re.exec(result)) !== null) {
    const p = match[1];
    if (p.length > 2 && !p.startsWith('http') && !paths.includes(p)) {
      paths.push(p);
    }
  }
  return paths.slice(0, 8);
}

export function AgentThinking({
  thinkingContent,
  toolCalls,
  filePatches,
  onToggleStep,
  onAcceptFilePatch,
  onRejectFilePatch,
}: AgentThinkingProps) {
  const { emitCommand } = useEditorCommandBus();
  const groups = useMemo(() => groupConsecutiveCalls(toolCalls), [toolCalls]);

  const handleFileClick = (filePath: string) => {
    if (filePath) {
      emitCommand({ type: 'goto', payload: { filePath } });
    }
  };

  if (toolCalls.length === 0 && !thinkingContent) return null;

  return (
    <div className="space-y-1 my-2" id="agent-thinking-scroll-anchor">
      {thinkingContent && (
        <div className="text-xs text-neutral-6 px-2.5 py-1.5 bg-neutral-2 rounded-lg border border-neutral-4 max-h-32 overflow-y-auto whitespace-pre-wrap">
          {thinkingContent}
        </div>
      )}

      {groups.map((group) => {
        const isGrouped = group.tools.length > 1;
        const first = group.tools[0];

        if (isGrouped) {
          const allCollapsed = group.tools.every((t) => t.collapsed);
          return (
            <div key={first.toolId} className="border border-neutral-4 rounded-lg overflow-hidden">
              <button
                onClick={() => group.tools.forEach((t) => onToggleStep(t.toolId))}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-neutral-2 transition-colors"
              >
                {allCollapsed
                  ? <ChevronRight className="h-3 w-3 text-neutral-6 shrink-0" />
                  : <ChevronDown className="h-3 w-3 text-neutral-6 shrink-0" />
                }
                <span className="text-neutral-7 shrink-0">
                  {toolIcons[group.toolName] || <Terminal className="h-3.5 w-3.5" />}
                </span>
                <span className="font-medium text-neutral-8">
                  {toolLabels[group.toolName] || group.toolName}
                </span>
                <span className="text-neutral-6">
                  {group.tools.length} 次调用
                </span>
              </button>

              {!allCollapsed && group.tools.map((tool) => (
                <ToolCallDetail
                  key={tool.toolId}
                  tool={tool}
                  filePatches={filePatches}
                  onAcceptFilePatch={onAcceptFilePatch}
                  onRejectFilePatch={onRejectFilePatch}
                  onFileClick={handleFileClick}
                />
              ))}
            </div>
          );
        }

        return (
          <div key={first.toolId} className="border border-neutral-4 rounded-lg overflow-hidden">
            <button
              onClick={() => onToggleStep(first.toolId)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-neutral-2 transition-colors"
            >
              {first.collapsed
                ? <ChevronRight className="h-3 w-3 text-neutral-6 shrink-0" />
                : <ChevronDown className="h-3 w-3 text-neutral-6 shrink-0" />
              }

              {statusIcons[first.status] || <div className="h-3.5 w-3.5 shrink-0" />}

              <span className="text-neutral-7 shrink-0">
                {toolIcons[first.toolName] || <Terminal className="h-3.5 w-3.5" />}
              </span>

              <span className="font-medium text-neutral-8">
                {toolLabels[first.toolName] || first.toolName}
              </span>

              {first.toolName === 'execute_command' ? (
                <span className="text-neutral-6 truncate ml-1 font-mono">
                  {formatFileArg(first.toolArgs)}
                </span>
              ) : (
                <span className="text-neutral-6 truncate ml-1">
                  {formatFileArg(first.toolArgs)}
                </span>
              )}

              {first.status === 'running' && (
                <span className="animate-pulse text-xs text-accent ml-auto">执行中...</span>
              )}
              {first.status === 'pending' && (
                <span className="text-xs text-neutral-6 ml-auto">等待中</span>
              )}
            </button>

            <ToolCallDetail
              tool={first}
              filePatches={filePatches}
              onAcceptFilePatch={onAcceptFilePatch}
              onRejectFilePatch={onRejectFilePatch}
              onFileClick={handleFileClick}
            />
          </div>
        );
      })}
    </div>
  );
}

function ToolCallDetail({
  tool,
  filePatches,
  onAcceptFilePatch,
  onRejectFilePatch,
  onFileClick,
}: {
  tool: ToolCall;
  filePatches: FilePatch[];
  onAcceptFilePatch: (filePath: string) => void;
  onRejectFilePatch: (filePath: string) => void;
  onFileClick: (filePath: string) => void;
}) {
  if (tool.collapsed) return null;

  const filePaths = tool.result ? extractFilePaths(tool.result) : [];

  return (
    <div className="px-2.5 pb-2">
      {tool.result && (
        <pre className="text-xs text-neutral-7 whitespace-pre-wrap font-mono bg-neutral-1 p-2 rounded border border-neutral-4 max-h-48 overflow-y-auto">
          {tool.result}
        </pre>
      )}

      {filePaths.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {filePaths.map((fp) => (
            <button
              key={fp}
              onClick={() => onFileClick(fp)}
              className="text-xs px-1.5 py-0.5 rounded bg-neutral-3 text-neutral-7 hover:bg-accent hover:text-white transition-colors font-mono"
            >
              {fp.split('/').pop() || fp}
            </button>
          ))}
        </div>
      )}

      {['write_file', 'replace_in_file'].includes(tool.toolName) && typeof tool.toolArgs.filePath === 'string' && (
        <FilePatchActions
          filePath={String(tool.toolArgs.filePath)}
          filePatches={filePatches}
          onAccept={onAcceptFilePatch}
          onReject={onRejectFilePatch}
        />
      )}
    </div>
  );
}

function FilePatchActions({
  filePath,
  filePatches,
  onAccept,
  onReject,
}: {
  filePath: string;
  filePatches: FilePatch[];
  onAccept: (path: string) => void;
  onReject: (path: string) => void;
}) {
  const patch = filePatches.find((p) => p.filePath === filePath);
  if (!patch || patch.accepted !== null) {
    if (patch?.accepted === true) {
      return <div className="mt-1.5 text-xs text-green-600">已接受</div>;
    }
    if (patch?.accepted === false) {
      return <div className="mt-1.5 text-xs text-neutral-6">已拒绝</div>;
    }
    return null;
  }

  return (
    <div className="mt-1.5 flex gap-1.5">
      <button
        onClick={() => onAccept(filePath)}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
      >
        <Check className="h-3 w-3" />
        接受
      </button>
      <button
        onClick={() => onReject(filePath)}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-neutral-4 text-neutral-8 hover:bg-neutral-5 transition-colors"
      >
        <X className="h-3 w-3" />
        拒绝
      </button>
    </div>
  );
}
