/**
 * 前端 WebSocket 类型定义
 * 与后端保持一致，用于类型安全的 Socket.IO 通信
 */

// ==================== 聊天消息 ====================

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

// ==================== 团队在线用户 ====================

export interface TeamOnlineData {
  count: number;
  users: string[];
}

// ==================== 通知 ====================

export interface NotificationData {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// ==================== 终端 ====================

export interface TerminalResizeData {
  cols: number;
  rows: number;
}

export interface TerminalInitData {
  projectId: string;
}
