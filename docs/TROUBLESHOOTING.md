# Troubleshooting & Diagnostics Guide — AI YouTube Automation OS

## 1. System Health Probes

Verify that all subsystems are online:
```bash
# Verify API & Database
curl -s http://localhost:3001/api/system/health | jq

# Verify Metrics & Memory
curl -s http://localhost:3001/api/system/metrics | jq
```

---

## 2. Common Issues & Resolutions

### Issue 1: Port 3001 or 5173 Already in Use
**Symptom**: `EADDRINUSE: address already in use :::3001`  
**Resolution**:
```bash
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process
```

### Issue 2: AI Provider Rate Limiting or Missing API Keys
**Symptom**: `RATE_LIMIT_EXCEEDED` or `AUTH_ERROR` in agent logs.  
**Resolution**: The system automatically activates intelligent high-fidelity deterministic fallback mock responses so local workflows continue without interruption. To use live cloud models, supply valid API keys in `server/.env`.

### Issue 3: Video Rendering Fails or Times Out
**Symptom**: Agent 8 reports `FFmpeg exit with error`.  
**Resolution**: Ensure `fluent-ffmpeg` and `ffmpeg-static` are installed via `npm run install:all`. Verify that output directory `/app/media/renders` has write permissions.

### Issue 4: WebSocket Disconnections
**Symptom**: Real-time progress bar does not update in browser.  
**Resolution**: Ensure reverse proxy allows WebSocket upgrade headers (`Upgrade: $http_upgrade`, `Connection: "Upgrade"`).
