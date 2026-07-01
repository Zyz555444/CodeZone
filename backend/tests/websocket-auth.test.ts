import { wsAuth } from '../src/websocket/auth';

// Mock jwt 和 logger
jest.mock('../src/lib/jwt', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const { verifyToken } = require('../src/lib/jwt');

function createMockSocket(authToken?: string, queryToken?: string) {
  const socket: any = {
    handshake: {
      auth: { token: authToken },
      query: { token: queryToken },
    },
    data: {},
  };
  return socket;
}

function callAuth(socket: any): Promise<Error | undefined> {
  return new Promise((resolve) => {
    wsAuth(socket, (err?: Error) => {
      resolve(err);
    });
  });
}

describe('wsAuth 认证中间件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('有效 token 应设置 socket.data.userId', async () => {
    verifyToken.mockReturnValue({ userId: 'user-123' });
    const socket = createMockSocket('valid-token-abc');

    const err = await callAuth(socket);

    expect(err).toBeUndefined();
    expect(socket.data.userId).toBe('user-123');
  });

  it('token 缺失时应拒绝连接', async () => {
    const socket = createMockSocket();

    const err = await callAuth(socket);

    expect(err).toBeDefined();
    expect(err!.message).toContain('token');
  });

  it('token 过短时应拒绝连接', async () => {
    const socket = createMockSocket('123');

    const err = await callAuth(socket);

    expect(err).toBeDefined();
    expect(err!.message).toContain('Invalid token format');
  });

  it('JWT 验证失败时应拒绝连接', async () => {
    verifyToken.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const socket = createMockSocket('some-invalid-token-value');

    const err = await callAuth(socket);

    expect(err).toBeDefined();
    expect(err!.message).toContain('Authentication failed');
  });

  it('JWT 过期时应返回特定错误', async () => {
    const expiredError = new Error('jwt expired');
    (expiredError as any).name = 'TokenExpiredError';
    verifyToken.mockImplementation(() => {
      throw expiredError;
    });
    const socket = createMockSocket('expired-token-value');

    const err = await callAuth(socket);

    expect(err).toBeDefined();
    expect(err!.message).toContain('Token expired');
  });

  it('应从 handshake.query.token 回退获取 token', async () => {
    verifyToken.mockReturnValue({ userId: 'user-456' });
    const socket = createMockSocket(undefined, 'query-token-valid');

    const err = await callAuth(socket);

    expect(err).toBeUndefined();
    expect(socket.data.userId).toBe('user-456');
  });
});
