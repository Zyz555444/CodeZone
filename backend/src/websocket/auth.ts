import { Socket } from 'socket.io';
import { verifyToken } from '../lib/jwt';
import { logger } from '../utils/logger';

/**
 * Socket.IO 统一认证中间件
 * 验证 handshake.auth.token 中的 JWT，通过后设置 socket.data.userId
 */
export function wsAuth(socket: Socket, next: (err?: Error) => void): void {
  try {
    const token = (socket.handshake.auth.token as string)
      || (socket.handshake.query.token as string);

    if (!token) {
      logger.warn('WebSocket authentication failed: token missing');
      return next(new Error('Missing authentication token'));
    }

    if (token.length < 10) {
      logger.warn('WebSocket authentication failed: invalid token format');
      return next(new Error('Invalid token format'));
    }

    let decoded: { userId: string };
    try {
      decoded = verifyToken(token);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('WebSocket authentication failed: token expired');
        return next(new Error('Token expired'));
      }
      logger.warn('WebSocket authentication failed', { error });
      return next(new Error('Authentication failed'));
    }

    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    logger.warn('WebSocket authentication failed', { error });
    next(new Error('Authentication failed'));
  }
}
