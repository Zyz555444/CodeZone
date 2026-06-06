# CodeZone API 文档

本文档介绍 CodeZone 平台的 REST API 接口。

## 基础信息

- Base URL: `http://localhost:4000/api`
- 认证方式：JWT Bearer Token
- 数据格式：JSON

## 认证

### 用户注册

**POST** `/auth/register`

注册新用户账号。

**请求体**:
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

**成功响应** (201):
```json
{
  "user": {
    "id": "clxxx1234...",
    "email": "user@example.com",
    "username": "username",
    "avatar": null,
    "role": "MEMBER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 用户登录

**POST** `/auth/login`

使用邮箱和密码登录。

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**成功响应** (200):
```json
{
  "user": {
    "id": "clxxx1234...",
    "email": "user@example.com",
    "username": "username"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 获取当前用户

**GET** `/auth/me`

获取当前登录用户的信息。

**Headers**:
```
Authorization: Bearer <token>
```

**成功响应** (200):
```json
{
  "user": {
    "id": "clxxx1234...",
    "email": "user@example.com",
    "username": "username",
    "avatar": "https://...",
    "bio": null,
    "role": "MEMBER",
    "isActive": true,
    "emailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## 项目管理

### 获取项目列表

**GET** `/projects`

获取当前用户的所有项目。

**Headers**:
```
Authorization: Bearer <token>
```

**成功响应** (200):
```json
{
  "projects": [
    {
      "id": "clxxx5678...",
      "name": "项目名称",
      "description": "项目描述",
      "visibility": "private",
      "ownerId": "clxxx1234...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "_count": {
        "tasks": 10,
        "members": 3,
        "files": 25
      }
    }
  ]
}
```

### 创建项目

**POST** `/projects`

创建一个新项目。

**Headers**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "name": "项目名称",
  "description": "项目描述（可选）",
  "visibility": "private"
}
```

**成功响应** (201):
```json
{
  "project": {
    "id": "clxxx5678...",
    "name": "项目名称",
    "description": "项目描述",
    "visibility": "private",
    "ownerId": "clxxx1234...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 获取项目详情

**GET** `/projects/:id`

获取指定项目的详细信息。

### 更新项目

**PATCH** `/projects/:id`

更新项目信息。

### 删除项目

**DELETE** `/projects/:id`

删除项目（仅限项目所有者）。

## 任务管理

### 获取任务列表

**GET** `/tasks`

获取任务列表，支持按项目筛选。

**Query Parameters**:
- `projectId` (可选): 项目 ID

**成功响应** (200):
```json
{
  "tasks": [
    {
      "id": "clxxx9012...",
      "title": "任务标题",
      "description": "任务描述",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "assigneeId": "clxxx1234...",
      "creatorId": "clxxx1234...",
      "dueDate": "2024-12-31T23:59:59.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "_count": {
        "comments": 5,
        "subtasks": 3
      }
    }
  ]
}
```

### 创建任务

**POST** `/tasks`

**请求体**:
```json
{
  "projectId": "clxxx5678...",
  "title": "任务标题",
  "description": "任务描述",
  "priority": "HIGH",
  "assigneeId": "clxxx1234...",
  "dueDate": "2024-12-31"
}
```

### 更新任务状态

**PATCH** `/tasks/:id`

**请求体**:
```json
{
  "status": "DONE"
}
```

## 代码文件

### 获取文件树

**GET** `/code/files`

**Query Parameters**:
- `projectId`: 项目 ID

**成功响应** (200):
```json
{
  "files": [
    {
      "id": "clxxxabcd...",
      "name": "src",
      "path": "/src",
      "type": "DIRECTORY",
      "children": [
        {
          "id": "clxxxefgh...",
          "name": "index.ts",
          "path": "/src/index.ts",
          "type": "FILE",
          "language": "typescript"
        }
      ]
    }
  ]
}
```

### 获取文件内容

**GET** `/code/files/:id`

### 更新文件内容

**PUT** `/code/files/:id`

**请求体**:
```json
{
  "content": "console.log('Hello, World!');"
}
```

## 代码审查

### 获取审查列表

**GET** `/reviews/reviews`

### 创建审查

**POST** `/reviews/reviews`

**请求体**:
```json
{
  "projectId": "clxxx5678...",
  "title": "审查标题"
}
```

## WebSocket 事件

### 客户端发送

#### 加入项目房间
```javascript
socket.emit('join-project', projectId);
```

#### 发送代码变更
```javascript
socket.emit('code-change', {
  projectId,
  fileId,
  content: 'new content'
});
```

#### 发送光标位置
```javascript
socket.emit('cursor-move', {
  projectId,
  fileId,
  position: { lineNumber: 10, column: 5 }
});
```

#### 加入聊天房间
```javascript
socket.emit('join-room', roomId);
```

#### 发送聊天消息
```javascript
socket.emit('send-message', {
  roomId,
  content: 'Hello!'
});
```

### 服务端广播

#### 在线用户更新
```javascript
socket.on('online-users', ({ users }) => {
  console.log('在线用户:', users);
});
```

#### 代码变更同步
```javascript
socket.on('code-change', (data) => {
  // 更新编辑器内容
});
```

#### 接收聊天消息
```javascript
socket.on('receive-message', (message) => {
  console.log('新消息:', message);
});
```

## 错误响应

所有错误都遵循统一的格式：

```json
{
  "error": "错误信息",
  "details": [] // 可选，验证错误的详细信息
}
```

### 常见错误码

| 状态码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证或令牌无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如重复的邮箱） |
| 500 | 服务器内部错误 |

## 速率限制

- 认证相关接口：10 次/分钟
- 数据读取接口：100 次/分钟
- 数据写入接口：30 次/分钟

## SDK 示例

### JavaScript

```javascript
const api = axios.create({
  baseURL: 'http://localhost:4000/api',
});

// 设置认证 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 使用示例
const response = await api.get('/projects');
console.log(response.data.projects);
```

### TypeScript

```typescript
import axios from 'axios';

interface Project {
  id: string;
  name: string;
  description?: string;
}

const api = axios.create({ baseURL: '/api' });

async function getProjects(): Promise<Project[]> {
  const response = await api.get('/projects');
  return response.data.projects;
}
```
