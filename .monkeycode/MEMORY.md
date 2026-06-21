# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [运维部署|构建方法|测试方法|排错调试|工作流协作|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

### Docker 生产镜像中 Prisma CLI 不可用
- Date: 2026-06-21
- Context: 在 docker/start.sh 中添加 `npx prisma db execute` 数据迁移步骤时发现
- Category: 运维部署
- Instructions:
  - `prisma` CLI 是 devDependency，Docker 构建时 `npm prune --production` 会将其移除
  - 生产镜像中所有 `npx prisma` 命令（migrate deploy、db push、db execute）均会失败
  - 解决方案：在 start.sh 中所有 prisma 命令添加 `2>/dev/null || echo` 错误处理，同时在后端 `index.ts` 启动时用 `@prisma/client` 的 `$executeRaw` 做兜底数据迁移
  - `docker/start.sh` 中已有 `npx prisma migrate deploy` 和 `npx prisma db push` 的容错处理，新增步骤应保持一致

### 团队角色四级设计
- Date: 2026-06-21
- Context: 实现团队成员角色变更功能
- Category: 工作流协作
- Instructions:
  - TeamRole 枚举：OWNER / ADMIN / MODERATOR / MEMBER
  - 权限判断统一使用 `isTeamManager(role)` 辅助函数（OWNER 或 ADMIN 返回 true）
  - 角色变更 API 不接受 OWNER 作为目标值（OWNER 仅通过创建团队产生）
  - 不可修改自己的角色；非 OWNER 不可修改 OWNER 角色
