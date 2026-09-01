# 24/7 Cloud Deployment Guide — AI YouTube Automation OS

## 1. Overview
The AI YouTube Automation OS is engineered for **uninterrupted 24/7 autonomous cloud operations**. The server operates independently of desktop client sessions—if the user closes the desktop app or powers down their local computer, the cloud orchestration engine continues executing workflows, rendering videos, and managing YouTube uploads.

---

## 2. Docker & Docker Compose Deployment

### Prerequisites
- Docker `v24.0+`
- Docker Compose `v2.20+`

### Step 1: Clone and Configure
```bash
git clone https://github.com/your-org/ai-youtube-automation-os.git
cd ai-youtube-automation-os
cp .env.example .env
```

### Step 2: Launch the 24/7 Container Stack
```bash
docker compose up -d --build
```

### Container Services Included
1. `ai_youtube_os_gateway`: Nginx reverse proxy with SSL termination and WebSocket streaming.
2. `ai_youtube_os_frontend`: Production SPA build of React / Vite web dashboard.
3. `ai_youtube_os_backend`: Express API, 10-Agent Orchestrator, SQLite WAL database, and FFmpeg media render pipeline.

---

## 3. High-Availability & Auto-Recovery
All container definitions include `restart: always` and built-in healthcheck probes targeting `/api/system/health`. In the event of a transient container exit or worker crash, Docker automatically restores the process and recovers ongoing workflows from SQLite state without data loss.

---

## 4. Production Domain & SSL (Nginx & Let's Encrypt)
To bind a custom domain (e.g. `https://app.yourdomain.com`), mount your SSL certificates in `nginx/nginx.conf` and forward ports `80` and `443`.
