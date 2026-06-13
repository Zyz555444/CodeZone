'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, File, Folder, FolderOpen, ChevronRight, ChevronDown, Save, MoreHorizontal, Search } from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';

interface FileNode {
  id: string;
  name: string;
  type: 'FILE' | 'DIRECTORY';
  children?: FileNode[];
  language?: string;
}

const mockFiles: FileNode[] = [
  {
    id: '1',
    name: 'src',
    type: 'DIRECTORY',
    children: [
      {
        id: '2',
        name: 'components',
        type: 'DIRECTORY',
        children: [
          { id: '3', name: 'Button.tsx', type: 'FILE', language: 'typescript' },
          { id: '4', name: 'Card.tsx', type: 'FILE', language: 'typescript' },
          { id: '5', name: 'Input.tsx', type: 'FILE', language: 'typescript' },
        ],
      },
      { id: '6', name: 'app', type: 'DIRECTORY', children: [
        { id: '7', name: 'page.tsx', type: 'FILE', language: 'typescript' },
        { id: '8', name: 'layout.tsx', type: 'FILE', language: 'typescript' },
      ]},
      { id: '9', name: 'index.ts', type: 'FILE', language: 'typescript' },
    ],
  },
  {
    id: '10',
    name: 'package.json',
    type: 'FILE',
    language: 'json',
  },
  {
    id: '11',
    name: 'tsconfig.json',
    type: 'FILE',
    language: 'json',
  },
  {
    id: '12',
    name: 'README.md',
    type: 'FILE',
    language: 'markdown',
  },
];

export default function CodePage() {
  const [files] = useState<FileNode[]>(mockFiles);
  const [selectedFile, setSelectedFile] = useState<string | null>('3');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1', '2']));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.id}>
        <button
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
            selectedFile === node.id
              ? 'bg-neutral-2 text-neutral-10 font-medium'
              : 'text-neutral-7 hover:text-neutral-9 hover:bg-neutral-2'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => {
            if (node.type === 'DIRECTORY') {
              toggleFolder(node.id);
            } else {
              setSelectedFile(node.id);
            }
          }}
        >
          {node.type === 'DIRECTORY' ? (
            <>
              {expandedFolders.has(node.id) ? (
                <ChevronDown className="h-4 w-4 text-neutral-6" />
              ) : (
                <ChevronRight className="h-4 w-4 text-neutral-6" />
              )}
              {expandedFolders.has(node.id) ? (
                <FolderOpen className="h-4 w-4 text-accent" />
              ) : (
                <Folder className="h-4 w-4 text-accent" />
              )}
            </>
          ) : (
            <>
              <span className="w-4" />
              <File className="h-4 w-4 text-neutral-5" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.type === 'DIRECTORY' && expandedFolders.has(node.id) && node.children && (
          <div>{renderFileTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  const selectedFileNode = (() => {
    const findFile = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.id === selectedFile) return node;
        if (node.children) {
          const found = findFile(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findFile(files);
  })();

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex overflow-hidden">
            {/* File Explorer */}
            <div className="w-64 border-r border-neutral-5 bg-neutral-1 shrink-0 flex flex-col">
              <div className="p-4 border-b border-neutral-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-6" />
                  <Input 
                    placeholder="搜索文件..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-neutral-2"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {renderFileTree(files)}
              </div>
              <div className="p-3 border-t border-neutral-5">
                <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  新建文件
                </Button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col bg-neutral-1">
              {/* Editor Tabs */}
              <div className="h-12 border-b border-neutral-5 flex items-center px-4 gap-2 bg-neutral-2/50">
                {selectedFileNode && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-1 rounded-t-lg border-t border-l border-r border-neutral-5">
                    <File className="h-4 w-4 text-neutral-6" />
                    <span className="text-sm">{selectedFileNode.name}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1">
                      <span className="text-neutral-5">×</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Editor Content */}
              <div className="flex-1 flex items-center justify-center bg-neutral-1">
                {selectedFileNode ? (
                  <div className="w-full h-full p-4">
                    <pre className="font-mono text-sm text-neutral-8">
{`// ${selectedFileNode.name}
// 点击文件开始编辑

import React from 'react';

export function ${selectedFileNode.name.replace(/\.\w+$/, '')}() {
  return (
    <div>
      {/* Your code here */}
    </div>
  );
}`}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center text-neutral-7">
                    <File className="h-12 w-12 mx-auto mb-4 text-neutral-5" />
                    <p>选择文件开始编辑</p>
                  </div>
                )}
              </div>

              {/* Status Bar */}
              <div className="h-7 border-t border-neutral-5 bg-neutral-2 flex items-center justify-between px-4 text-xs text-neutral-7">
                <div className="flex items-center gap-4">
                  <span>TypeScript</span>
                  <span>UTF-8</span>
                  <span>LF</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>行 1, 列 1</span>
                  <span>Spaces: 2</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
    </TeamGuard>
  );
}
