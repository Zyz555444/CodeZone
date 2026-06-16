import { setupWSConnection } from 'y-websocket/bin/utils';
import { WebSocketServer } from 'ws';
import http from 'http';
import { logger } from '../utils/logger';

let wss: WebSocketServer | null = null;

export function setupCollaborationServer(httpServer: http.Server): void {
  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', setupWSConnection);

  httpServer.on('upgrade', (request, socket, head) => {
    const url = request.url || '';

    if (url.startsWith('/ws/')) {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    }
  });

  logger.info('Yjs 协作编辑服务已初始化');
}

export function getWSS(): WebSocketServer | null {
  return wss;
}
