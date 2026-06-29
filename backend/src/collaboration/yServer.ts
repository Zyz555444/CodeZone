import { setupWSConnection } from 'y-websocket/bin/utils';
import { WebSocketServer } from 'ws';
import { parse as parseUrl } from 'url';
import http from 'http';
import { verifyToken } from '../lib/jwt';
import { hasProjectAccess } from '../lib/projectAccess';
import { logger } from '../utils/logger';

let wss: WebSocketServer | null = null;

function extractToken(url: string): string | null {
  try {
    const parsed = parseUrl(url, true);
    return (parsed.query.token as string) || null;
  } catch {
    return null;
  }
}

function extractProjectIdAndFileId(url: string): { projectId?: string; fileId?: string } {
  try {
    const parsed = parseUrl(url, true);
    return {
      projectId: parsed.query.projectId as string | undefined,
      fileId: parsed.query.fileId as string | undefined,
    };
  } catch {
    return {};
  }
}

export function setupCollaborationServer(httpServer: http.Server): void {
  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', setupWSConnection);

  httpServer.on('upgrade', async (request, socket, head) => {
    const url = request.url || '';

    if (!url.startsWith('/ws/')) return;

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

    const { projectId } = extractProjectIdAndFileId(url);
    if (projectId) {
      try {
        if (!(await hasProjectAccess(userId, projectId))) {
          logger.warn('Yjs collaboration: project access denied', { userId, projectId });
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }
      } catch (err) {
        logger.error('Yjs collaboration: access check failed', { error: err });
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    wss!.handleUpgrade(request, socket, head, (ws) => {
      wss!.emit('connection', ws, request);
    });
  });

  logger.info('Yjs 协作编辑服务已初始化');
}

export function getWSS(): WebSocketServer | null {
  return wss;
}
