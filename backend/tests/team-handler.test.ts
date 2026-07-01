import { TeamHandler } from '../src/websocket/team-handler';
import { EVENTS } from '../src/websocket/types';

jest.mock('../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Create a simple EventEmitter stub for Socket.IO Server
class MockServer {
  handlers: Map<string, (...args: any[]) => void> = new Map();

  on(event: string, handler: (...args: any[]) => void): void {
    this.handlers.set(event, handler);
  }

  emit(event: string, ...args: any[]): void {
    const handler = this.handlers.get(event);
    handler?.(...args);
  }
}

function createMockConnectionManager() {
  return {
    getIO: jest.fn(),
    trackTeamUser: jest.fn().mockResolvedValue(undefined),
    untrackTeamUser: jest.fn().mockResolvedValue(undefined),
    getTeamOnlineUsers: jest.fn().mockResolvedValue([]),
    broadcastTeamOnlineUsers: jest.fn().mockResolvedValue(undefined),
    onConnect: jest.fn().mockResolvedValue(undefined),
    onDisconnect: jest.fn().mockResolvedValue(undefined),
    sendToUser: jest.fn(),
    broadcastToTeam: jest.fn(),
    pushNotification: jest.fn().mockResolvedValue(undefined),
  } as any;
}

function createMockSocket(userId?: string) {
  const handlers = new Map<string, Function>();
  const socket: any = {
    data: { userId },
    rooms: new Set<string>(),
    join: jest.fn(function (this: any, room: string) {
      this.rooms.add(room);
    }),
    leave: jest.fn(function (this: any, room: string) {
      this.rooms.delete(room);
    }),
    on: jest.fn(function (this: any, event: string, handler: Function) {
      handlers.set(event, handler);
    }),
    emit: jest.fn(),
    getHandler(event: string): Function | undefined {
      return handlers.get(event);
    },
  };
  return socket;
}

describe('TeamHandler', () => {
  let mockIO: MockServer;
  let mockConnMgr: ReturnType<typeof createMockConnectionManager>;
  let teamHandler: TeamHandler;
  let connectionHandler: ((socket: any) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnMgr = createMockConnectionManager();
    teamHandler = new TeamHandler(mockConnMgr);

    mockIO = new MockServer();
    teamHandler.register(mockIO as any);

    connectionHandler = mockIO.handlers.get('connection') as ((socket: any) => void) | undefined;
    expect(connectionHandler).not.toBeUndefined();
  });

  it('连接时应将用户加入 user:{userId} 房间', () => {
    const socket = createMockSocket('user-1');
    connectionHandler!(socket);

    expect(socket.join).toHaveBeenCalledWith('user:user-1');
  });

  it('加入团队时应加入对应房间并追踪和广播', async () => {
    const socket = createMockSocket('user-1');
    connectionHandler!(socket);

    const joinHandler = socket.getHandler(EVENTS.TEAM_JOIN);
    await joinHandler!('team-1');

    expect(socket.join).toHaveBeenCalledWith('team:team-1');
    expect(mockConnMgr.trackTeamUser).toHaveBeenCalledWith('user-1', 'team-1');
    expect(mockConnMgr.broadcastTeamOnlineUsers).toHaveBeenCalledWith('team-1');
    expect(socket.data.teamId).toBe('team-1');
  });

  it('切换团队时应先离开旧团队', async () => {
    const socket = createMockSocket('user-1');
    connectionHandler!(socket);

    const joinHandler = socket.getHandler(EVENTS.TEAM_JOIN);
    await joinHandler!('team-1');
    // Switch to team-2
    await joinHandler!('team-2');

    expect(mockConnMgr.untrackTeamUser).toHaveBeenCalledWith('user-1', 'team-1');
    expect(socket.leave).toHaveBeenCalledWith('team:team-1');
    expect(socket.join).toHaveBeenCalledWith('team:team-2');
    expect(socket.data.teamId).toBe('team-2');
  });

  it('离开团队时应退出房间并广播', async () => {
    const socket = createMockSocket('user-1');
    connectionHandler!(socket);

    const joinHandler = socket.getHandler(EVENTS.TEAM_JOIN);
    await joinHandler!('team-1');

    const leaveHandler = socket.getHandler(EVENTS.TEAM_LEAVE);
    await leaveHandler!('team-1');

    expect(socket.leave).toHaveBeenCalledWith('team:team-1');
    expect(mockConnMgr.untrackTeamUser).toHaveBeenCalledWith('user-1', 'team-1');
    expect(mockConnMgr.broadcastTeamOnlineUsers).toHaveBeenCalledWith('team-1');
  });

  it('断开连接时应清理追踪', async () => {
    const socket = createMockSocket('user-1');
    connectionHandler!(socket);

    const joinHandler = socket.getHandler(EVENTS.TEAM_JOIN);
    await joinHandler!('team-1');

    const disconnectHandler = socket.getHandler('disconnect');
    await disconnectHandler!();

    expect(mockConnMgr.untrackTeamUser).toHaveBeenCalledWith('user-1', 'team-1');
    expect(mockConnMgr.broadcastTeamOnlineUsers).toHaveBeenCalledWith('team-1');
  });
});
