'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useTerminal } from '@/lib/websocket/hooks';

import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  projectId: string;
  visible: boolean;
  onClose: () => void;
}

export function TerminalPanel({ projectId, visible, onClose }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // 使用 Socket.IO 终端 hook
  const { initialized, bindOutput, sendInput, sendResize } = useTerminal(projectId);

  const initTerminal = useCallback(() => {
    if (!containerRef.current || terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        black: '#45475a',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#f5c2e7',
        cyan: '#94e2d5',
        white: '#bac2de',
        brightBlack: '#585b70',
        brightRed: '#f38ba8',
        brightGreen: '#a6e3a1',
        brightYellow: '#f9e2af',
        brightBlue: '#89b4fa',
        brightMagenta: '#f5c2e7',
        brightCyan: '#94e2d5',
        brightWhite: '#a6adc8',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // 终端输入通过 Socket.IO 发送
    term.onData((data) => {
      sendInput(data);
    });

    // 终端大小调整
    term.onResize(({ cols, rows }) => {
      sendResize(cols, rows);
    });

    // 窗口大小变化时重新适配
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [sendInput, sendResize]);

  // 当终端初始化后，绑定后端输出
  useEffect(() => {
    if (initialized && terminalRef.current) {
      return bindOutput(terminalRef.current.write.bind(terminalRef.current));
    }
  }, [initialized, bindOutput]);

  // visible 时初始化终端
  useEffect(() => {
    if (visible && containerRef.current && !terminalRef.current) {
      const cleanup = initTerminal();
      return () => {
        cleanup?.();
      };
    }
  }, [visible, initTerminal]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="flex flex-col border-t border-neutral-3 bg-[#1e1e2e]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-2 border-b border-neutral-3">
        <span className="text-label-12 font-medium text-neutral-8">终端</span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-neutral-3 text-neutral-6 text-label-12"
        >
          ✕
        </button>
      </div>
      <div ref={containerRef} className="flex-1" style={{ height: '200px' }} />
    </div>
  );
}
