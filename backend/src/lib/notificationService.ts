import { ConnectionManager } from '../websocket/connection-manager';
import { logger } from '../utils/logger';

let connMgr: ConnectionManager | null = null;

export function setConnectionManager(manager: ConnectionManager): void {
  connMgr = manager;
}

export async function createAndPushNotification(
  userId: string,
  title: string,
  content: string,
  type: string
): Promise<void> {
  try {
    if (connMgr) {
      await connMgr.pushNotification(userId, title, content, type);
    }
  } catch (error) {
    logger.error('创建并推送通知失败', { error, userId });
  }
}
