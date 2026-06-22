import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse as parseUrl } from 'url';
import { verifyToken } from '../lib/jwt';
import { terminalManager } from './TerminalManager';
import { logger } from '../utils/logger';

export function setupTerminalServer(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? parseUrl(request.url).pathname : '';

    if (pathname === '/terminal') {
      const token = extractToken(request.url || '');

      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      let userId: string;
      try {
        const decoded = verifyToken(token);
        userId = decoded.userId;
      } catch {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        setupTerminalConnection(ws, userId, request);
      });
    }
  });

  logger.info('Terminal WebSocket server initialized');
}

function extractToken(url: string): string | null {
  try {
    const parsed = parseUrl(url, true);
    return (parsed.query.token as string) || null;
  } catch {
    return null;
  }
}

function extractParams(url: string): { projectId?: string } {
  try {
    const parsed = parseUrl(url, true);
    return {
      projectId: parsed.query.projectId as string | undefined,
    };
  } catch {
    return {};
  }
}

function setupTerminalConnection(ws: WebSocket, userId: string, request: any): void {
  const { projectId } = extractParams(request.url || '');
  const sessionId = `term_${userId}_${Date.now()}`;

  ws.on('error', (error) => {
    logger.error('Terminal WebSocket error', { sessionId, error: error.message });
  });

  terminalManager.createSession(sessionId, ws, projectId || '', userId);
}
