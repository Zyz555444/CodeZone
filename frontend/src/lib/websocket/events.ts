/**
 * WebSocket 事件名常量
 * 与后端 backend/src/websocket/types.ts 保持严格一致
 * 所有事件名采用 namespace:action 格式
 */
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
