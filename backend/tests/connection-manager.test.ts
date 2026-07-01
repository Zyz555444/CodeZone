import { ConnectionManager } from '../src/websocket/connection-manager';
import { EVENTS } from '../src/websocket/types';

// Mock 外部依赖
jest.mock('../src/lib/redis', () => ({
  getRedisClient: jest.fn(() => ({
    sAdd: jest.fn(),
    sRem: jest.fn(),
    sMembers: jest.fn().mockResolvedValue([]),
  })),
  isRedisConnected: jest.fn(() => false),
}));

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    notification: {
      create: jest.fn().mockResolvedValue({
        id: 'notif-1',
        title: 'Test',
        content: 'Test content',
        type: 'info',
        createdAt: new Date(),
      }),
    },
  },
}));

jest.mock('../src/lib/cache', () => ({
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ConnectionManager', () => {
  let mockIO: any;
  let connMgr: ConnectionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIO = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    connMgr = new ConnectionManager(mockIO);
  });

  describe('sendToUser', () => {
    it('应向 user:{userId} 房间发送事件', () => {
      connMgr.sendToUser('user-1', 'custom-event', { foo: 'bar' });

      expect(mockIO.to).toHaveBeenCalledWith('user:user-1');
      expect(mockIO.emit).toHaveBeenCalledWith('custom-event', { foo: 'bar' });
    });
  });

  describe('broadcastToTeam', () => {
    it('应向 team:{teamId} 房间广播事件', () => {
      connMgr.broadcastToTeam('team-1', EVENTS.TEAM_ONLINE, { count: 3, users: ['u1', 'u2', 'u3'] });

      expect(mockIO.to).toHaveBeenCalledWith('team:team-1');
      expect(mockIO.emit).toHaveBeenCalledWith(EVENTS.TEAM_ONLINE, {
        count: 3,
        users: ['u1', 'u2', 'u3'],
      });
    });
  });

  describe('getIO', () => {
    it('应返回传入的 io 实例', () => {
      expect(connMgr.getIO()).toBe(mockIO);
    });
  });

  describe('onConnect', () => {
    it('应将用户加入 user:{userId} 房间', async () => {
      const socket: any = {
        data: { userId: 'user-10' },
        join: jest.fn(),
      };

      await connMgr.onConnect(socket);

      expect(socket.join).toHaveBeenCalledWith('user:user-10');
    });
  });
});
