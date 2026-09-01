# AI YOUTUBE AUTOMATION OS 🎬⚡

> **Production-Ready Multi-Agent YouTube Content Production & Channel Growth Platform**
> Complete Web Application + Windows Desktop Control Panel + 10-Agent AI Cloud Operations Engine.

---

## 🌟 Key Highlights

- **10 Autonomous Specialized Agents**: Full pipeline from Market Intelligence, Deep Research, Story Architecture, Fact Checking, Voice & Audio, Visual Assets, Video Generation, Timeline Editing, SEO & Thumbnails, to Master Orchestration.
- **Dual Client Architecture**: Modern Web Application (`Next.js / React 18 / Tailwind / Zustand`) + Windows Desktop Application (`Tauri / Electron`).
- **Voiceover-First Temporal Anchor**: Sub-second accurate audio timing maps driving 9-track master video timeline composition and dynamic subtitle overlays.
- **Independent Fact-Checking Quality Gates**: 0-blind-trust verification hierarchy with 7-dimension QA scoring and automatic targeted revisions.
- **24/7 Cloud Operation**: Dockerized stack, background recovery, resilient provider fallbacks, and JWT/RBAC role security (`OWNER`, `ADMIN`, `EDITOR`, `VIEWER`).
- **Official YouTube API v3 Integration**: OAuth2 credential management, thumbnail and video upload automation, scheduled publishing, and post-publish analytics tracking.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Launch Development Environment
```bash
# Starts Express backend (http://localhost:3001) & React Frontend (http://localhost:5173)
npm run dev
```

### 4. Optional: Launch Windows Desktop App
```bash
# Via Electron
cd desktop && npm start

# Or via Tauri (requires Rust)
npm run tauri dev
```

---

## 🐳 24/7 Cloud Deployment (Docker)

```bash
docker-compose up -d --build
```
Access the application at `http://localhost` or your configured domain.

---

## 📚 Complete Documentation

- 🏛️ [Architecture Deep Dive](docs/ARCHITECTURE.md)
- 🛠️ [Installation Guide](docs/INSTALLATION.md)
- ☁️ [24/7 Cloud Deployment](docs/DEPLOYMENT.md)
- 🧠 [10-Agent System Specification](docs/AGENT_SYSTEM.md)
- 🔌 [REST & WebSocket API Reference](docs/API_DOCUMENTATION.md)
- 🛡️ [Security & RBAC Model](docs/SECURITY.md)
- 🩺 [Troubleshooting & Health Diagnostics](docs/TROUBLESHOOTING.md)

---

## 📄 License
MIT License. Built with ❤️ for autonomous AI YouTube content creators.
