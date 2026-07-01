import { Server } from 'socket.io';
import { YSocketIO } from 'y-socket.io/dist/server';
import { logger } from '../utils/logger';

/**
 * Yjs 协作编辑处理器
 * 使用 y-socket.io 适配器，通过 Socket.IO 传输 Yjs CRDT 文档同步数据
 * 替代原来的原生 ws y-websocket 方案
 */
export class CollaborationHandler {
  private ysocketio: YSocketIO;

  constructor(io: Server) {
    this.ysocketio = new YSocketIO(io, {
      // 认证回调：由 Socket.IO 的 auth 中间件已校验 JWT
      // 此处可做二次项目权限校验
      authenticate: (_handshake: any) => true,
      // 垃圾回收保持开启
      gcEnabled: true,
    });
  }

  initialize(): void {
    this.ysocketio.initialize();

    // 文档加载时的回调
    this.ysocketio.on('document-loaded', (doc: any) => {
      logger.info('Yjs document loaded', { room: doc.name || 'unknown' });
    });

    // 文档更新时的回调
    this.ysocketio.on('document-update', (doc: any, _update: Uint8Array) => {
      logger.debug('Yjs document updated', { room: doc.name || 'unknown' });
    });

    // 所有连接关闭时的回调
    this.ysocketio.on('all-document-connections-closed', (doc: any) => {
      logger.info('All connections closed for Yjs document', {
        room: doc.name || 'unknown',
      });
    });

    logger.info('Yjs collaboration service initialized (y-socket.io)');
  }
}
