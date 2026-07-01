# 需求实施计划

- [x] 1. 后端 WebSocket 基础设施（auth.ts + types.ts + connection-manager.ts）
  - 创建 `backend/src/websocket/auth.ts`：抽取统一的 JWT 认证中间件，将现有 WebSocketHandler 中的 authenticate 方法移植到此文件，验证 token 后设置 `socket.data.userId`
  - 创建 `backend/src/websocket/types.ts`：定义 `AuthenticatedSocket` 扩展接口、`EVENTS` 事件名常量对象（team:join、chat:message:send、collab:join、term:input 等）、ChatMessage 接口等所有共享类型，消除各文件中的重复类型定义
  - 创建 `backend/src/websocket/connection-manager.ts`：实现 `ConnectionManager` 类，包含 onConnect/onDisconnect 生命周期方法、getTeamOnlineUsers 查询方法、sendToUser/broadcastToTeam/pushNotification 广播方法，通过 Redis 追踪在线用户
  - 当前依赖：`lib/jwt.ts` 的 `verifyToken`、`lib/redis.ts` 的 `getRedisClient`/`isRedisConnected`、`lib/prisma.ts` 的 `prisma`
  - `connection-manager.ts` 的 pushNotification 方法整合当前 `notificationService.ts` 中的通知持久化 + 实时推送逻辑
  - [x] 1.1 为 auth.ts 的认证中间件编写单元测试：验证有效 token 设置 userId、无效 token 拒绝连接、过期 token 拒绝连接
  - [x] 1.2 为 connection-manager.ts 的广播方法编写单元测试：验证 sendToUser 向正确房间发送、broadcastToTeam 向团队房间广播

- [x] 2. 后端 team-handler.ts（团队协作处理器）
  - 创建 `backend/src/websocket/team-handler.ts`：从 WebSocketHandler 中迁移 team 相关逻辑
  - 注册 EVENTS.TEAM_JOIN / EVENTS.TEAM_LEAVE 事件处理：与当前 join-team/leave-team 逻辑一致，房间名为 `team:{teamId}`，通过 ConnectionManager 广播在线用户
  - 连接时自动加入 `user:{userId}` 个人房间
  - 移除 WebSocketHandler 中不再需要的 code-change/cursor-move 相关代码（这些改为 Yjs 协作）
  - [x] 2.1 为 team-handler 的 join/leave 逻辑编写单元测试：验证加入团队后加入正确房间、离开团队后离开房间、在线用户广播正确

- [x] 3. 后端 chat-handler.ts（聊天处理器）
  - 创建 `backend/src/websocket/chat-handler.ts`：从 ChatWebSocketHandler 迁移全部聊天逻辑
  - 迁移事件名：`join-room` -> `EVENTS.CHAT_JOIN`、`send-message` -> `EVENTS.CHAT_MESSAGE_SEND`、`typing-start` -> `EVENTS.CHAT_TYPING_START` 等
  - 保持原有业务逻辑不变：房间管理、消息持久化到 ChatMessage 表、历史消息加载、输入状态广播、在线用户追踪
  - 依赖 ConnectionManager 获取 `io` 实例进行广播（而非直接持有 `io`）

- [x] 4. 检查点 - 确保 team-handler 和 chat-handler 可独立注册，类型无冲突，如有疑问请询问用户

- [x] 5. 后端 collaboration-handler.ts（Yjs 协作编辑）
  - 安装依赖 `y-socket.io`（npm install y-socket.io）
  - 创建 `backend/src/websocket/collaboration-handler.ts`：使用 `YSocketIO` 类初始化 Yjs 文档同步服务
  - 在 YSocketIO 的认证钩子中做项目访问权限二次校验（调用 hasProjectAccess）
  - 文档按 docId 隔离（对应现有的 fileId），每个文档由 y-socket.io 内部管理 Y.Doc 实例
  - 监听 `document-loaded` 事件处理文档初始化逻辑

- [x] 6. 后端 terminal-handler.ts（终端处理器）
  - 创建 `backend/src/websocket/terminal-handler.ts`：使用 Socket.IO 事件桥接 node-pty
  - 注册 `term:init` 事件：验证项目访问权限，调用 TerminalManager 创建 PTY 会话
  - 注册 `term:input` 事件：将前端输入写入 pty 进程的 stdin
  - 注册 `term:resize` 事件：调整 pty 终端的行列大小
  - 修改 `TerminalManager`：将 `ws: WebSocket` 参数替换为 `send: (data: string) => void` 回调函数，使其与传输层解耦
  - disconnect 时自动清理 PTY 进程

- [x] 7. 后端 index.ts 统一初始化 + 清理旧代码
  - 创建 `backend/src/websocket/index.ts`：实现 `initializeWebSocket(httpServer)` 统一初始化函数
  - 函数内部：创建 Socket.IO Server（含 Redis 适配器），注册 auth 中间件，实例化 ConnectionManager 和所有 handler（TeamHandler、ChatHandler、CollaborationHandler、TerminalHandler），注册统一的 connect/disconnect 生命周期
  - 修改 `backend/src/index.ts`：移除原有的 `WebSocketHandler`、`ChatWebSocketHandler`、`setupCollaborationServer`、`setupTerminalServer` 引用，替换为 `initializeWebSocket(httpServer)` 单一调用
  - 修改 `backend/src/lib/notificationService.ts`：移除全局 `io` 变量和 `setIO` 函数，改为导出一个接收 ConnectionManager 的初始化函数，或将通知推送逻辑直接移入 connection-manager.ts
  - 删除文件：`backend/src/websocket/WebSocketHandler.ts`、`backend/src/websocket/ChatWebSocketHandler.ts`、`backend/src/collaboration/yServer.ts`、`backend/src/terminal/TerminalServer.ts`、`backend/src/types/y-websocket.d.ts`

- [x] 8. 检查点 - 确保后端编译通过（npx tsc --noEmit），所有引用正确，如有疑问请询问用户

- [x] 9. 前端 events.ts + types.ts 基础设施

- [x] 10. 前端 WebSocketService 精简

- [x] 11. 前端 React Hooks 实现

- [x] 12. 前端组件改造 - Header

- [x] 13. 前端组件改造 - ChatRoom

- [x] 14. 前端组件改造 - CodeEditor / 协作编辑器整合

- [x] 15. 前端组件改造 - TerminalPanel

- [x] 16. 检查点 - 确保前端编译通过（npm run build），如有疑问请询问用户
