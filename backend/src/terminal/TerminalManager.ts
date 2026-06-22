import { spawn, IPty } from 'node-pty';
import { WebSocket } from 'ws';
import { logger } from '../utils/logger';

interface TerminalSession {
  pty: IPty;
  ws: WebSocket;
  projectId: string;
  userId: string;
  createdAt: Date;
}

class TerminalManagerImpl {
  private sessions: Map<string, TerminalSession> = new Map();
  private maxSessions = 20;

  createSession(sessionId: string, ws: WebSocket, projectId: string, userId: string): void {
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

    const session: TerminalSession = { pty, ws, projectId, userId, createdAt: new Date() };
    this.sessions.set(sessionId, session);

    pty.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    pty.onExit(({ exitCode }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`\r\n\x1b[33mProcess exited with code ${exitCode}\x1b[0m\r\n`);
      }
      this.sessions.delete(sessionId);
    });

    ws.on('message', (raw: Buffer | string) => {
      const data = raw.toString();
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'resize') {
          pty.resize(msg.cols, msg.rows);
          return;
        }
        if (msg.type === 'input') {
          pty.write(msg.data);
          return;
        }
      } catch {
        pty.write(data);
      }
    });

    ws.on('close', () => {
      this.destroySession(sessionId);
    });

    ws.on('error', () => {
      this.destroySession(sessionId);
    });

    logger.info('Terminal session created', { sessionId, projectId, userId });
  }

  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      session.pty.kill();
    } catch {
      // already dead
    }

    try {
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.close();
      }
    } catch {
      // already closed
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

  destroyAll(): void {
    for (const [id] of this.sessions) {
      this.destroySession(id);
    }
  }
}

export const terminalManager = new TerminalManagerImpl();
