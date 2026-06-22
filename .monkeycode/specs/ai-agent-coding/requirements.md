# Requirements Document

## Introduction

为 CodeZone 平台实现全面的 AI Coding Agent 功能，将基础 AI 助手升级为具备项目感知、多步推理、文件操作和终端执行能力的智能编程代理。同时为团队管理员提供 AI 模型、API 密钥和用量控制的统一管理入口。将 AI Agent 深度集成到 Monaco 代码编辑器中。

## Glossary

- **AI Agent**: 具备项目上下文感知、多步任务执行能力的智能编程助手
- **AI 模型配置**: 团队级别的 AI 模型供应商和参数设置
- **流式响应**: 服务端通过 SSE (Server-Sent Events) 逐 token 推送 AI 输出
- **代码补丁**: AI Agent 生成的代码变更规范（old string → new string），用户可预览并逐个接受/拒绝
- **项目上下文**: 由项目文件树、选定文件和当前编辑器内容组成的上下文信息
- **工具调用**: AI Agent 发起的文件读写、搜索、命令执行等操作请求
- **TeamRole**: OWNER > ADMIN > MODERATOR > MEMBER，角色等级沿用已有设计

## Requirements

### Requirement 1: 团队 AI 设置管理

**User Story:** AS 团队 OWNER/ADMIN，I want 配置团队级别的 AI 模型供应商和参数，so that 可以控制团队成员使用的 AI 能力和成本。

#### Acceptance Criteria

1. The system SHALL 提供团队 AI 设置页面，包含模型供应商、API 端点、API 密钥和默认模型配置项。
2. WHEN OWNER 或 ADMIN 修改 AI 设置时，the system SHALL 验证所填 API 端点和密钥的有效性（通过一次测试调用）。
3. WHEN 团队成员使用 AI 功能时，the system SHALL 优先使用团队配置的 AI 设置；若团队未配置，则回退到系统默认设置。
4. IF 团队 AI 设置中的 API 密钥无效，the system SHALL 向调用者返回明确的"AI 服务未配置"错误。
5. WHEN 非 OWNER/ADMIN 尝试访问 AI 设置接口，the system SHALL 返回 403 权限不足。
6. The system SHALL 支持为团队配置多个可选模型，并设置其中一个为默认模型。

### Requirement 2: AI 用量监控与配额控制

**User Story:** AS 团队 OWNER/ADMIN，I want 监控团队的 AI 使用量并设置配额，so that 可以控制 AI 功能的成本。

#### Acceptance Criteria

1. The system SHALL 记录每次 AI 调用的 token 用量和调用者信息。
2. WHEN 管理员查询 AI 用量时，the system SHALL 返回指定时间范围内的总 token 数、各模型使用分布和每个成员的用量统计。
3. WHEN 团队设置了月度 token 配额上限，the system SHALL 在达到上限后拒绝新的 AI 请求并返回 429 配额耗尽错误。
4. The system SHALL 在配额消耗达到 80% 时向团队管理员发送通知。

### Requirement 3: AI 流式对话

**User Story:** AS 开发者，I want AI 对话支持流式输出，so that 可以实时看到 AI 的回复生成过程、减少等待感。

#### Acceptance Criteria

1. WHEN 用户发送 AI 对话消息，the system SHALL 通过 SSE 流式返回 AI 回复内容，逐 token 推送到前端。
2. WHILE AI 正在生成回复，the frontend SHALL 实时渲染流式文本内容并自动滚动到底部。
3. IF 流式连接中断，the system SHALL 在前端显示已接收的部分内容并提示用户重试。
4. WHEN 用户点击停止按钮，the system SHALL 中断当前 AI 生成并保留已生成的内容。

### Requirement 4: AI Agent 项目上下文感知

**User Story:** AS 开发者，I want AI Agent 能够理解当前项目的文件结构和代码内容，so that AI 能给出与项目相关的精准回答。

#### Acceptance Criteria

1. WHEN AI Agent 被激活，the system SHALL 自动搜集当前项目的文件树结构和当前打开文件的内容作为上下文。
2. The system SHALL 支持用户手动选择附加的文件作为 AI 对话的额外上下文。
3. WHEN 上下文总长度超过模型最大 token 限制时，the system SHALL 按优先级裁剪上下文（当前打开文件 > 手动选择文件 > 文件树结构）。
4. The system SHALL 在 AI 对话面板中展示当前已附加的上下文信息（选中文件数量、总 token 估算）。

### Requirement 5: AI Agent 文件操作

**User Story:** AS 开发者，I want AI Agent 能够直接读写项目文件，so that AI 可以帮助完成修改代码、创建文件等编程任务。

#### Acceptance Criteria

1. WHEN AI Agent 生成代码变更建议，the system SHALL 以结构化补丁形式（文件路径 + 修改片段 + 操作类型）返回，前端以 Diff 视图展示。
2. WHEN 用户确认 AI 的文件变更建议，the system SHALL 执行实际的文件修改并保存到 CodeFile 表。
3. WHEN AI Agent 建议创建新文件，the system SHALL 在项目中创建对应的 CodeFile 记录和编辑器内文件。
4. IF 文件修改涉及当前协作编辑中的文件，the system SHALL 通过 Yjs 同步变更到其他协作用户。
5. The system SHALL 在 AI 对话中为每个文件操作建议提供"接受"、"拒绝"和"查看差异"操作按钮。

### Requirement 6: AI Agent 终端命令执行

**User Story:** AS 开发者，I want AI Agent 能够执行终端命令（如安装依赖、运行测试），so that AI 可以辅助完成构建、调试等操作。

#### Acceptance Criteria

1. WHEN AI Agent 建议执行终端命令，the system SHALL 在前端展示命令内容和说明后，由用户手动确认执行。
2. WHEN 用户在 CodeZone 内置终端中执行 AI 建议的命令后，the system SHALL 允许将终端输出反馈给 AI Agent 以继续分析。
3. IF AI 建议的命令属于系统管理类危险命令（shutdown、reboot、rm -rf 等），the system SHALL 拒绝执行并警告用户。
4. The system SHALL 在与 AI Agent 的对话中显示命令执行状态（等待确认、执行中、已完成、失败）。

### Requirement 7: 编辑器深度集成

**User Story:** AS 开发者，I want AI Agent 功能深度嵌入 Monaco 编辑器的交互流程中，so that 无需离开编辑器即可使用 AI 辅助编程。

#### Acceptance Criteria

1. WHEN 用户在编辑器中选中代码后，the system SHALL 在选中区域附近显示 AI 操作快捷菜单（解释、修复、优化、生成注释）。
2. WHEN 用户通过快捷键（Ctrl+K）触发 AI 内联输入框，the system SHALL 允许用户以自然语言描述需求并由 AI 生成代码插入当前光标位置。
3. The system SHALL 在编辑器中提供 AI 代码补全的幽灵文本建议功能（ghost text suggestion），用户按 Tab 键接受。
4. WHEN AI 对话中提及特定文件和行号，the editor SHALL 支持点击跳转到对应位置。

### Requirement 8: AI 对话历史与持久化

**User Story:** AS 开发者，I want AI 对话历史被保存并与项目关联，so that 可以随时回顾之前的 AI 交互记录。

#### Acceptance Criteria

1. The system SHALL 将每个项目的 AI 对话历史持久化到数据库（Conversation + Message 模型）。
2. WHEN 用户重新打开项目，the system SHALL 展示之前的 AI 对话列表并支持恢复任意历史对话。
3. WHEN 用户创建新对话，the system SHALL 自动将对话与当前项目和用户关联。
4. The system SHALL 支持用户删除和重命名 AI 对话。

### Requirement 9: AI Agent 推理过程展示

**User Story:** AS 开发者，I want 看到 AI Agent 的内部推理过程（thinking），so that 可以理解 AI 为什么做出某个建议。

#### Acceptance Criteria

1. WHEN AI Agent 收到复杂任务请求，the system SHALL 在对话中展示 AI 的推理过程和工具调用步骤。
2. The system SHALL 以可折叠区域展示推理过程，默认展开最近一步、折叠历史步骤。
3. The system SHALL 在推理过程中展示 AI 调用的工具（读文件、搜索代码等）及其结果摘要。

### Requirement 10: 团队 AI 功能权限控制

**User Story:** AS 团队 OWNER/ADMIN，I want 控制哪些团队成员可以使用 AI 功能，so that 可以管理 AI 功能的使用范围。

#### Acceptance Criteria

1. WHEN 管理员在团队设置中禁用某成员的 AI 使用权限，the system SHALL 拒绝该成员的所有 AI API 请求并返回 403。
2. The system SHALL 默认允许所有 ACTIVE 团队成员使用 AI 功能。
3. The system SHALL 支持按角色级别设置 AI 功能权限（如仅允许 ADMIN 和 MODERATOR 使用 AI）。
