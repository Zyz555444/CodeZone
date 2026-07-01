import { Server } from 'socket.io';
import { ConnectionManager } from './connection-manager';
import { AuthenticatedSocket, EVENTS } from './types';
import { logger } from '../utils/logger';

/**
 * 团队协作处理器
 * 负责：
 * - 连接时自动加入 user:{userId} 个人房间
 * - 监听 team:join / team:leave 事件进行房间管理
 * - 通过 ConnectionManager 追踪在线用户并广播
 */
export class TeamHandler {
  private connMgr: ConnectionManager;

  constructor(connMgr: ConnectionManager) {
    this.connMgr = connMgr;
  }

  register(io: Server): void {
    io.on('connection', (socket: AuthenticatedSocket) => {
      // 连接时自动加入个人通知房间
      if (socket.data.userId) {
        socket.join(`user:${socket.data.userId}`);
        logger.info(`User ${socket.data.userId} joined personal room`);
      }

      // 加入团队
      socket.on(EVENTS.TEAM_JOIN, async (teamId: string) => {
        try {
          if (!teamId || !socket.data.userId) return;

          // 离开之前加入的团队
          if (socket.data.teamId) {
            socket.leave(`team:${socket.data.teamId}`);
            await this.connMgr.untrackTeamUser(socket.data.userId, socket.data.teamId);
          }

          // 加入新团队房间
          socket.join(`team:${teamId}`);
          socket.data.teamId = teamId;

          // 追踪用户到 Redis
          await this.connMgr.trackTeamUser(socket.data.userId, teamId);

          // 广播在线用户列表
          await this.connMgr.broadcastTeamOnlineUsers(teamId);

          logger.info(`User ${socket.data.userId} joined team ${teamId}`);
        } catch (error) {
          logger.error('Error joining team', { error, userId: socket.data.userId, teamId });
        }
      });

      // 离开团队
      socket.on(EVENTS.TEAM_LEAVE, async (teamId: string) => {
        try {
          if (!teamId || !socket.data.userId) return;

          socket.leave(`team:${teamId}`);
          await this.connMgr.untrackTeamUser(socket.data.userId, teamId);
          await this.connMgr.broadcastTeamOnlineUsers(teamId);

          if (socket.data.teamId === teamId) {
            socket.data.teamId = undefined;
          }

          logger.info(`User ${socket.data.userId} left team ${teamId}`);
        } catch (error) {
          logger.error('Error leaving team', { error, userId: socket.data.userId, teamId });
        }
      });

      // 断开连接
      socket.on('disconnect', async () => {
        if (socket.data.teamId && socket.data.userId) {
          await this.connMgr.untrackTeamUser(socket.data.userId, socket.data.teamId);
          await this.connMgr.broadcastTeamOnlineUsers(socket.data.teamId);
        }
        logger.info(`User ${socket.data.userId} disconnected from team`);
      });
    });
  }
}
