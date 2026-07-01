import { Socket } from 'socket.io';

// ==================== 认证 Socket 类型 ====================

export interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    userName?: string;
    teamId?: string;
  };
}

// ==================== 事件常量 ====================

export const EVENTS = {
  // 团队协作
  TEAM_JOIN: 'team:join',
  TEAM_LEAVE: 'team:leave',
  TEAM_ONLINE: 'team:online',

  // 聊天
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_MESSAGE_SEND: 'chat:message:send',
  CHAT_MESSAGE_RECEIVE: 'chat:message:receive',
  CHAT_HISTORY: 'chat:history',
  CHAT_ROOM_UPDATE: 'chat:room:update',
  CHAT_TYPING_START: 'chat:typing:start',
  CHAT_TYPING_STOP: 'chat:typing:stop',

  // 协作编辑 (Yjs)
  COLLAB_JOIN: 'collab:join',
  COLLAB_LEAVE: 'collab:leave',

  // 终端
  TERM_INIT: 'term:init',
  TERM_INPUT: 'term:input',
  TERM_OUTPUT: 'term:output',
  TERM_RESIZE: 'term:resize',

  // 通知
  NOTIFICATION: 'notification',
} as const;

// ==================== 聊天消息类型 ====================

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'TEXT' | 'SYSTEM';
}

export interface ChatRoomUpdate {
  roomId: string;
  users: string[];
  count: number;
}

export interface ChatTypingData {
  userId: string;
  userName?: string;
  roomId: string;
}

// ==================== 通知类型 ====================

export interface NotificationData {
  id?: string;
  title: string;
  content: string;
  type: string;
  isRead?: boolean;
  createdAt?: string;
}

// ==================== 团队在线用户 ====================

export interface TeamOnlineData {
  count: number;
  users: string[];
}

// ==================== Redis 前缀常量 ====================

export const REDIS_PREFIXES = {
  TEAM_ONLINE: 'online:team:',
  ROOM_ONLINE: 'online:room:',
  USER_ROOMS: 'user:rooms:',
} as const;
