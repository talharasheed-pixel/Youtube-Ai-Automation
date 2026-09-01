# System Architecture — AI YouTube Automation OS

## 1. High-Level System Architecture

```
                             USER
                              │
                  ┌───────────┴───────────┐
                  │                       │
                  ▼                       ▼
            WEB APPLICATION         DESKTOP APP
            (React / Tailwind)     (Tauri / Electron)
                  │                       │
                  └───────────┬───────────┘
                              │
                           HTTPS
                              │
                              ▼
                     REVERSE PROXY / NGINX
                              │
                              ▼
                     REST API & WEBSOCKET
                     (Node.js / Express)
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
        AUTH SERVICE     PROJECT SERVICE   WEBSOCKET BUS
                              │
                              ▼
                      AGENT ORCHESTRATOR
                          (AGENT 10)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
     AGENT 1               AGENT 2               AGENT 3
  (Market Intel)       (Deep Research)        (Scriptwriter)
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                           AGENT 4
                        (Fact Checker)
                              │
                              ▼
                           AGENT 10
                        (Quality Gate)
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
              AGENT 5      AGENT 6      AGENT 7
             (Voiceover)   (Visuals)    (Video Gen)
                 │            │            │
                 └────────────┼────────────┘
                              ▼
                           AGENT 8
                        (Video Editor)
                              │
                              ▼
                           AGENT 9
                     (SEO & Thumbnails)
                              │
                              ▼
                           AGENT 10
                        (Final Review)
                              │
                              ▼
                     HUMAN APPROVAL GATE
                              │
                              ▼
                     YOUTUBE DATA API v3
```

## 2. Multi-Tier Data Architecture

- **State & Metadata Store**: WASM SQLite (`sql.js`) running in WAL mode with disk persistence, storing projects, tasks, research, scripts, fact checks, media assets, videos, approvals, and analytics.
- **Binary & Media Storage**: S3-compatible file storage tree storing generated audio (`.wav`/`.mp3`), visual assets (`.png`/`.jpg`), video clips (`.mp4`), subtitles (`.srt`), and master renders (`.mp4`).
- **Real-Time Communication**: Socket.IO bi-directional WebSocket event bus emitting granular task progress, agent state shifts, quality warnings, and approval requests.

## 3. Autonomous Execution & Quality Gate Pipeline

1. **Stage 1 (Market Research)**: Agent 1 calculates 9-factor scores and presents topic candidates.
2. **Human Topic Review Gate**: User selects winning topic.
3. **Stage 2 (Deep Research)**: Agent 2 compiles 3-level source hierarchy and fact database.
4. **Stage 3 (Scriptwriting)**: Agent 3 builds 9-part scene plan with voiceover performance tags.
5. **Stage 4 (Fact Checking)**: Agent 4 independently audits every claim (PASS / REVISE / REJECT).
6. **Stage 5 (Voice & Visual)**: Agent 5 generates segmented audio with timing map; Agent 6 generates visual assets simultaneously.
7. **Stage 6 (Video Generation)**: Agent 7 produces 5-second micro-shots.
8. **Stage 7 (Video Editing)**: Agent 8 composites 9-track master timeline with audio-synchronized subtitles.
9. **Stage 8 (SEO & Thumbnails)**: Agent 9 generates 3 thumbnail concepts, scored titles, and timestamped chapters.
10. **Stage 9 (Final QA)**: Agent 10 validates cross-agent consistency and prepares human approval package.
11. **Stage 10 (Human Approval Gate)**: Owner cryptographically signs off on version for YouTube upload.
