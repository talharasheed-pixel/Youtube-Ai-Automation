# REST & WebSocket API Reference — AI YouTube Automation OS

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Register a new user account with role selection.
- **Request Body**: `{ "name": "Alice", "email": "alice@example.com", "password": "...", "role": "EDITOR" }`
- **Response**: `{ "message": "User registered successfully", "user": { ... }, "token": "..." }`

### `POST /api/auth/login`
Authenticate user credentials and receive JWT session token.
- **Request Body**: `{ "email": "admin@domain.com", "password": "..." }`
- **Response**: `{ "message": "Login successful", "user": { ... }, "token": "..." }`

### `GET /api/auth/me`
Retrieve currently authenticated user profile (Requires `Bearer <token>`).

---

## 2. Project & Workflow Endpoints (`/api/projects`, `/api/workflow`)

### `GET /api/projects`
List all active and archived projects with aggregate task counts.

### `POST /api/projects`
Create a new video production project.
- **Request Body**:
```json
{
  "title": "Autonomous Multi-Agent Systems in 2026",
  "niche": "Artificial Intelligence",
  "targetAudience": "Engineers, Architects",
  "primaryLanguage": "en",
  "formatType": "Long-form",
  "budgetLimit": 50.0
}
```

### `POST /api/projects/:id/command`
Issue an orchestration command to Agent 10.
- Commands: `START`, `PAUSE`, `RESUME`, `APPROVE`, `REVISION_REQUEST`, `REJECT`

---

## 3. Tasks & Assets Endpoints (`/api/tasks`, `/api/assets`)

- `GET /api/tasks?projectId=...&status=...`: Query task queue status.
- `GET /api/assets?projectId=...&assetType=...`: Query generated media assets.

---

## 4. System Health Endpoints (`/api/system`)

- `GET /api/system/health`: Service status (`api`, `database`, `agentOrchestrator`, `websocket`).
- `GET /api/system/metrics`: CPU load, memory utilization, task counts.

---

## 5. WebSocket Event Specifications (Socket.IO)

Clients connect to `ws://localhost:3001` and join project rooms via `socket.emit('subscribe:project', projectId)`.

- `workflow:stage`: Stage transitions and lifecycle status updates.
- `workflow:progress`: Granular progress percentages (0–100%).
- `agent:action`: Detailed agent actions and logs.
- `approval:required`: Human approval gate event with full publishing package.
