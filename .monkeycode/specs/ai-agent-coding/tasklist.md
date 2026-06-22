# 需求实施计划 (P1)

- [x] 1. 数据库模型与迁移
  - [x] 1.1 在 schema.prisma 中新增 AIProvider 枚举和 TeamAISettings、AIConversation、AIMessage 模型
    - 字段和关系参照 design.md 数据模型章节
    - TeamAISettings.apiKey 需标注为敏感字段，API 响应时屏蔽
  - [x] 1.2 执行 prisma migrate 创建数据库迁移

- [x] 2. 检查点 - 确保迁移成功且模型与 design.md 一致

- [x] 2. 后端 Provider 供应商架构
  - [x] 2.1 创建 `backend/src/lib/ai/types.ts` 定义 AIProvider 接口、Message、ChatOptions、StreamChunk 等核心类型
    - 参照 design.md 组件与接口章节的 Provider 接口定义
  - [x] 2.2 创建 `backend/src/lib/ai/providers/openai.ts` 实现 OpenAI 兼容供应商（chat + streamChat + validateConfig）
    - 支持 SSE streaming via fetch + ReadableStream
    - 温度、maxTokens、topP 等参数映射
  - [x] 2.3 创建 `backend/src/lib/ai/providers/anthropic.ts` 实现 Anthropic 供应商
    - Anthropic Messages API 格式转换
  - [x] 2.4 创建 `backend/src/lib/ai/providers/custom.ts` 实现自定义供应商（兼容 OpenAI 格式，可配端点）
  - [x] 2.5 创建 `backend/src/lib/ai/providers/registry.ts` 实现 ProviderRegistry
    - register/provider 方法
    - resolve(teamSettings?) 根据团队配置或系统默认选择供应商

- [x] 3. 后端 AI Service 升级
  - [x] 3.1 重构 `backend/src/lib/ai/service.ts`（替代现有 `aiService.ts`）
    - 集成 ProviderRegistry
    - 实现 streamChat(messages, options) 返回 AsyncIterable<string>
    - 实现 chatSync 兼容现有非流式调用
    - 环境变量 MCAI_LLM_BASE_URL / MCAI_LLM_API_KEY 作为系统默认配置
  - [x] 3.2 创建 `backend/src/lib/ai/context.ts` 实现 ContextCollector
    - collectProjectContext(projectId, currentFileId?, selectedFileIds?) 搜集文件树和代码内容
    - trimContext() 按 token 预算裁剪
  - [x] 3.3 创建 `backend/src/lib/ai/crypto.ts` 实现 API Key 加密/解密工具
    - 使用 AES-256-GCM，密钥来自环境变量 MCAI_ENCRYPTION_KEY

- [x] 4. 后端 API 路由实现
  - [x] 4.1 创建 `backend/src/routes/aiSettings.ts` 实现团队 AI 设置 CRUD
    - GET /api/ai/settings - 获取团队设置（屏蔽 apiKey）
    - PUT /api/ai/settings - 更新设置（OWNER/ADMIN 权限，加密存储 apiKey）
    - POST /api/ai/settings/validate - 测试连接有效性
    - GET /api/ai/models - 列出可用模型
  - [x] 4.2 创建 `backend/src/controllers/aiSettingsController.ts`
    - 实现各路由处理函数，调用 ProviderRegistry 验证
    - 参照 design.md 错误处理章节的错误映射
  - [x] 4.3 创建 `backend/src/routes/aiConversations.ts` 实现对话管理 CRUD
    - GET /api/ai/conversations?projectId=x - 获取项目对话列表
    - POST /api/ai/conversations - 创建新对话
    - GET /api/ai/conversations/:id - 获取对话+消息列表
    - DELETE /api/ai/conversations/:id - 删除对话
    - PATCH /api/ai/conversations/:id - 更新标题
  - [x] 4.4 创建 `backend/src/controllers/aiConversationController.ts`
  - [x] 4.5 增强 `backend/src/routes/ai.ts` 添加流式端点
    - POST /api/ai/chat/stream - SSE 流式对话（参照 design.md 流式响应实现章节）
    - 主体逻辑在 aiController 的新方法 streamChat 中
    - 集成 ContextCollector 自动附加项目上下文
    - 对话消息自动持久化到 AIMessage 表
  - [x] 4.6 增强 `backend/src/controllers/aiController.ts` 新增 streamChat 方法
    - SSE 头设置、客户端断开检测、错误处理
    - 消息保存逻辑封装
  - [x] 4.7 在 `backend/src/index.ts` 注册新路由

- [x] 5. 检查点 - 确保所有 API 端点正确返回数据

- [x] 5. 前端状态管理
  - [x] 5.1 创建 `frontend/src/stores/aiStore.ts` 使用 Zustand
    - conversations 列表、activeConversationId、isStreaming、streamContent、contextFiles、selectedModel 状态
    - createConversation / loadConversations / sendMessage / stopStreaming 等 actions
  - [x] 5.2 创建 `frontend/src/lib/ai.ts` 封装 AI API 调用
    - streamChat() 使用 fetch + ReadableStream 消费 SSE
    - 回调 onToken / onDone / onError 模式

- [x] 6. 前端 AI 对话面板重写
  - [x] 6.1 完全重写 `frontend/src/components/AIPanel.tsx` 为 AIAgentPanel
    - 对话列表侧栏（历史对话切换、新建对话）
    - 流式 Markdown 渲染（使用 react-markdown）
    - 消息发送和流式接收
    - 停止生成按钮
    - 上下文文件附加器（显示项目文件树供选择）
    - 模型选择下拉菜单
    - 加载/空状态/错误状态覆盖
  - [x] 6.2 删除旧的 tab 模式（explain/review/generate），统一为对话式 Agent 交互
    - explain/review/generate 作为对话中的快捷指令（/explain, /review, /generate）

- [x] 7. 前端团队 AI 设置页面
  - [x] 7.1 创建 `frontend/src/app/settings/ai/page.tsx` 团队 AI 设置页
    - 供应商选择（OpenAI / Anthropic / 自定义）
    - API 端点、密钥输入（密钥脱敏显示）
    - 模型管理（启用/禁用模型列表，设置默认）
    - 链接测试按钮（调用 validate 端点）
    - 仅 OWNER/ADMIN 可见（使用 TeamGuard）
    - 保存/重置/错误提示

- [x] 8. 前端路由与集成
  - [x] 8.1 在 frontend layout 或设置导航中添加 AI 设置入口（仅团队 OWNER/ADMIN 可见）
  - [x] 8.2 更新 CollaborativeWorkspace 中 AIPanel 的引用
  - [x] 8.3 确保 AI 功能在无团队配置时回退到系统默认

- [x] 9. 检查点 - 端到端验证：前端 -> 流式对话 -> 持久化 -> 历史加载
