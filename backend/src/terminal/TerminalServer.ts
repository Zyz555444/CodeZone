import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse as parseUrl } from 'url';
import { verifyToken } from '../lib/jwt';
import { hasProjectAccess } from '../lib/projectAccess';
import { terminalManager } from './TerminalManager';
import { logger } from '../utils/logger';

export function setupTerminalServer(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', async (request, socket, head) => {
    const pathname = request.url ? parseUrl(request.url).pathname : '';

    if (pathname !== '/terminal') return;

    const url = request.url || '';
    const token = extractToken(url);

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

    const { projectId } = extractParams(url);
    if (projectId) {
      try {
        if (!(await hasProjectAccess(userId, projectId))) {
          logger.warn('Terminal: project access denied', { userId, projectId });
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }
      } catch (err) {
        logger.error('Terminal: access check failed', { error: err });
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      setupTerminalConnection(ws, userId, request);
    });
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
