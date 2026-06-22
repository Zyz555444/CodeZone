'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { getToken } from '@/lib/utils';
import { wsUrl } from '@/lib/env';

import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  projectId: string;
  visible: boolean;
  onClose: () => void;
}

export function TerminalPanel({ projectId, visible, onClose }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const connectTerminal = useCallback(() => {
    if (!containerRef.current) return;

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

    const token = getToken();
    const baseWsUrl = wsUrl();
    const wsProtocol = baseWsUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = baseWsUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wsEndpoint = `${wsProtocol}://${wsHost}/terminal?token=${token}&projectId=${projectId}`;

    const ws = new WebSocket(wsEndpoint);
    wsRef.current = ws;

    ws.onopen = () => {
      term.write('\x1b[32mConnected to terminal\x1b[0m\r\n');
    };

    ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        event.data.text().then((text) => term.write(text));
      } else {
        term.write(event.data as string);
      }
    };

    ws.onclose = () => {
      term.write('\r\n\x1b[33mTerminal disconnected\x1b[0m\r\n');
    };

    ws.onerror = () => {
      term.write('\r\n\x1b[31mTerminal connection error\x1b[0m\r\n');
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [projectId]);

  useEffect(() => {
    if (visible && containerRef.current && !terminalRef.current) {
      const cleanup = connectTerminal();
      return () => {
        cleanup?.();
      };
    }
  }, [visible, connectTerminal]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="flex flex-col border-t border-neutral-3 bg-[#1e1e2e]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-2 border-b border-neutral-3">
        <span className="text-xs font-medium text-neutral-8">终端</span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-neutral-3 text-neutral-6 text-xs"
        >
          ✕
        </button>
      </div>
      <div ref={containerRef} className="flex-1" style={{ height: '200px' }} />
    </div>
  );
}
