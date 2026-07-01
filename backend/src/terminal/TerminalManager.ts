import { spawn, IPty } from 'node-pty';
import { logger } from '../utils/logger';

/**
 * 终端会话回调接口
 * 将 WebSocket 依赖替换为回调，实现传输层解耦
 */
export interface TerminalSessionCallbacks {
  send: (data: string) => void;
  onClose: () => void;
}

interface TerminalSession {
  pty: IPty;
  projectId: string;
  userId: string;
  createdAt: Date;
}

class TerminalManagerImpl {
  private sessions: Map<string, TerminalSession> = new Map();
  private maxSessions = 20;

  createSession(
    sessionId: string,
    projectId: string,
    userId: string,
    callbacks: TerminalSessionCallbacks
  ): IPty {
    if (this.sessions.size >= this.maxSessions) {
      const oldest = this.sessions.keys().next().value;
      if (oldest) this.destroySession(oldest);
    }

    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const cwd = process.cwd();

    const pty = spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        CODEZONE_PROJECT_ID: projectId,
      },
    });

    const session: TerminalSession = { pty, projectId, userId, createdAt: new Date() };
    this.sessions.set(sessionId, session);

    // PTY 输出通过回调发送
    pty.onData((data: string) => {
      callbacks.send(data);
    });

    // PTY 退出通知
    pty.onExit(({ exitCode }) => {
      callbacks.send(`\r\n\x1b[33mProcess exited with code ${exitCode}\x1b[0m\r\n`);
      this.sessions.delete(sessionId);
      callbacks.onClose();
    });

    logger.info('Terminal session created', { sessionId, projectId, userId });
    return pty;
  }

  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      session.pty.kill();
    } catch {
      // already dead
    }

    this.sessions.delete(sessionId);
    logger.info('Terminal session destroyed', { sessionId });
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  writeToSession(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.pty.write(data);
    return true;
  }

  resizeSession(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.pty.resize(cols, rows);
    return true;
  }

  destroyAll(): void {
    for (const [id] of this.sessions) {
      this.destroySession(id);
    }
  }
}

export const terminalManager = new TerminalManagerImpl();
