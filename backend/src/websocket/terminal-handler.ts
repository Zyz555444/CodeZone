import { Server } from 'socket.io';
import { terminalManager } from '../terminal/TerminalManager';
import { hasProjectAccess } from '../lib/projectAccess';
import { logger } from '../utils/logger';
import { AuthenticatedSocket, EVENTS } from './types';

/**
 * 终端处理器
 * 通过 Socket.IO 事件桥接 node-pty 伪终端进程
 * 替代原来的原生 ws TerminalServer
 */
export class TerminalHandler {
  register(io: Server): void {
    io.on('connection', (socket: AuthenticatedSocket) => {
      let sessionId: string | null = null;

      // 初始化终端
      socket.on(EVENTS.TERM_INIT, async ({ projectId }: { projectId: string }) => {
        try {
          if (!socket.data.userId) {
            socket.emit(EVENTS.TERM_OUTPUT, '\r\n\x1b[31mError: Not authenticated\x1b[0m\r\n');
            return;
          }

          // 项目访问权限校验
          if (projectId) {
            const hasAccess = await hasProjectAccess(socket.data.userId, projectId);
            if (!hasAccess) {
              socket.emit(EVENTS.TERM_OUTPUT, '\r\n\x1b[31mError: Access denied to project\x1b[0m\r\n');
              return;
            }
          }

          sessionId = `term_${socket.data.userId}_${Date.now()}`;

          terminalManager.createSession(
            sessionId,
            projectId,
            socket.data.userId,
            {
              send: (data: string) => {
                socket.emit(EVENTS.TERM_OUTPUT, data);
              },
              onClose: () => {
                sessionId = null;
              },
            }
          );

          logger.info('Terminal session initialized via Socket.IO', {
            sessionId,
            userId: socket.data.userId,
          });
        } catch (error) {
          logger.error('Failed to init terminal', { error, userId: socket.data.userId });
          socket.emit(EVENTS.TERM_OUTPUT, '\r\n\x1b[31mError: Failed to create terminal session\x1b[0m\r\n');
        }
      });

      // 终端输入
      socket.on(EVENTS.TERM_INPUT, (data: string) => {
        if (!sessionId) return;
        terminalManager.writeToSession(sessionId, data);
      });

      // 终端大小调整
      socket.on(EVENTS.TERM_RESIZE, ({ cols, rows }: { cols: number; rows: number }) => {
        if (!sessionId) return;
        terminalManager.resizeSession(sessionId, cols, rows);
      });

      // 断开连接时清理
      socket.on('disconnect', () => {
        if (sessionId) {
          logger.info('Terminal session cleanup on disconnect', { sessionId });
          terminalManager.destroySession(sessionId);
        }
      });
    });

    logger.info('Terminal handler registered (Socket.IO bridge)');
  }
}
