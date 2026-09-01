# Installation & Setup Guide — AI YouTube Automation OS

## Prerequisites

- **Node.js**: `v20.0.0` or higher
- **NPM**: `v10.0.0` or higher
- **FFmpeg**: (Optional for local video rendering, bundled automatically via `ffmpeg-static`)
- **Rust / Cargo**: (Optional, only required if compiling Tauri native desktop binary)

---

## 1. Local Environment Setup

### Clone Repository
```bash
git clone https://github.com/your-org/ai-youtube-automation-os.git
cd ai-youtube-automation-os
```

### Install All Dependencies
```bash
npm run install:all
```

---

## 2. Environment Configuration

Create a `.env` file in the root and in `server/`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_2026

# AI Provider API Keys (Optional - System uses intelligent mock fallback when omitted)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
ELEVENLABS_API_KEY=...
STABILITY_API_KEY=sk-...
RUNWAY_API_KEY=...

# YouTube Data API v3 (OAuth2)
YOUTUBE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_google_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3001/api/youtube/oauth2callback
```

---

## 3. Running the System

### Start Web Application & Backend
```bash
npm run dev
```
- **Web Dashboard**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`

### Start Desktop Application
```bash
# Option A: Electron Desktop Control Panel
cd desktop && npm start

# Option B: Tauri Windows Native
npm run tauri dev
```
