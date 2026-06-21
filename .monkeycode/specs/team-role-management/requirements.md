# Requirements Document

## Introduction

为 CodeZone 团队管理模块增加团队成员角色变更功能，允许团队创建者和管理员调整成员的等级。将团队角色从现有的两级（ADMIN/MEMBER）扩展为四级（OWNER/ADMIN/MODERATOR/MEMBER）。

## Glossary

- **OWNER**: 团队创建者角色，为 `Team.ownerId` 对应的用户，具有最高管理权限，角色不可被修改
- **ADMIN**: 团队管理员，可审批/拒绝成员、查看邀请码、变更成员角色
- **MODERATOR**: 团队协管员，等级高于普通成员但低于管理员
- **MEMBER**: 团队普通成员，默认加入角色
- **Role Hierarchy**: OWNER > ADMIN > MODERATOR > MEMBER，高等级角色可管理低等级角色

## Requirements

### Requirement 1: 扩展团队角色枚举

**User Story:** AS 系统开发者，I want 团队角色支持四级枚举，so that 团队可以有更细粒度的等级管理。

#### Acceptance Criteria

1. The system SHALL 将 TeamRole 枚举扩展为 `OWNER | ADMIN | MODERATOR | MEMBER`。
2. WHEN 创建团队时，the system SHALL 将创建者的团队角色自动设为 `OWNER`。
3. WHEN 成员通过邀请码加入团队时，the system SHALL 将成员的团队角色默认设为 `MEMBER`。

### Requirement 2: 变更团队成员角色

**User Story:** AS 团队 OWNER 或 ADMIN，I want 变更团队中其他成员的角色等级，so that 可以灵活管理团队的管理层人员。

#### Acceptance Criteria

1. WHEN OWNER 或 ADMIN 通过 API 请求变更某成员的角色，the system SHALL 验证请求者有权操作目标成员。
2. WHEN 请求者的角色不是 OWNER 且不是 ADMIN，the system SHALL 拒绝请求并返回 403 权限不足错误。
3. WHEN 目标成员不属于该团队或不存在，the system SHALL 返回 404 成员不存在错误。
4. WHEN 目标成员状态不是 ACTIVE，the system SHALL 拒绝请求并返回 400 错误。
5. IF 请求的角色值无效（非合法 TeamRole 枚举值），the system SHALL 返回 400 参数错误。

### Requirement 3: 角色变更自保约束

**User Story:** AS 团队成员，I want 系统保护高等级成员不被低等级成员修改角色，so that 团队管理架构不会被破坏。

#### Acceptance Criteria

1. WHEN 请求者尝试变更自己的角色，the system SHALL 拒绝请求并返回 400 不能修改自己角色的错误。
2. WHEN 非 OWNER 尝试变更 OWNER 角色的成员，the system SHALL 拒绝请求并返回 403 权限不足错误。
3. WHEN ADMIN 尝试将其他成员提升为 ADMIN，the system SHALL 允许该操作。
4. WHEN ADMIN 尝试变更 ADMIN 角色的其他成员，the system SHALL 允许该操作（同级可管理）。

### Requirement 4: 前端角色变更界面

**User Story:** AS 团队 OWNER 或 ADMIN，I want 在团队页面成员列表中操作成员角色变更，so that 可以方便地提升或降级成员等级。

#### Acceptance Criteria

1. WHILE 当前用户在团队中角色为 OWNER 或 ADMIN，the system SHALL 在成员列表中每个非自己的 ACTIVE 成员行显示角色变更操作入口。
2. WHEN 用户点击角色变更入口，the system SHALL 显示可选的角色下拉列表（排除当前角色和 OWNER 角色，ADMIN 不可将成员设为 OWNER）。
3. WHEN 当前用户为 ADMIN 且目标成员为 OWNER，the system SHALL 不显示角色变更入口。
4. WHEN 用户选择新角色并确认，the system SHALL 调用后端 API 执行角色变更并刷新成员列表。
5. IF 角色变更失败，the system SHALL 显示友好的错误提示信息。

### Requirement 5: 角色变更记录

**User Story:** AS 团队 OWNER，I want 了解谁在什么时候被提升了，so that 可以追踪团队管理变动。

#### Acceptance Criteria

1. WHEN 成员角色被变更，the system SHALL 在 `TeamMember` 记录中更新 `updatedAt` 时间戳。
