# Implementation Plan: Visible YouTube Studio Browser Automation Layer

## Overview
Modify and extend the existing 10-agent AI YouTube automation platform so that agent actions (Video Upload, Title, Description, Thumbnail, Tags/Hashtags, Audience/Visibility settings, Verification, and Confirmation) are visibly performed and verified inside the real YouTube Studio browser interface.

## Architecture Components

1. **`server/src/automation/selectors.js`**:
   - Resilient selector abstraction layer (Accessible ARIA labels, semantic roles, content text matching, CSS/XPath fallbacks).
2. **`server/src/automation/browser-controller.js`**:
   - Manages visible Chrome/Edge browser session (`headless: false`) using `playwright-core`.
   - Reuses user data / browser profile so existing YouTube sessions remain active.
   - Unicode-safe typing (Urdu, Roman Urdu, Arabic, Hindi, English, Emojis, line breaks) with clipboard/direct input.
   - Visual indicator/highlighting of active elements during automation.
   - Verification of UI state (reads back inputs, verifies file upload completion).
3. **`server/src/automation/youtube-studio-controller.js`**:
   - Encapsulates high-level Studio workflows:
     - `openStudio(channelId)`
     - `startUpload(videoPath)`
     - `enterTitle(title)` + verify
     - `enterDescription(description)` + verify
     - `uploadThumbnail(thumbnailPath)` + verify
     - `setAudienceSettings(madeForKids)`
     - `enterTags(tags)`
     - `setVisibilityAndPublish(visibility, dryRun, confirmationRequired)`
4. **`server/src/automation/agent-task-queue.js`**:
   - Structured action queue (Action Object -> Automation Controller -> Verification -> Dashboard Status).
5. **Backend Integration (`server/src/app.js`, `server/src/routes/automation.js`, `server/src/services/workflow-engine.js`)**:
   - Expose REST and WebSocket endpoints for controlling browser automation, Dry Run mode, Human Confirmation gate, and live event logs.
6. **Frontend Updates (`client/src/pages/YouTubeStudioLive.jsx`)**:
   - Live browser automation logger with agent-by-agent step indicators, action verification badges, Dry Run toggle, and "Confirm Publish" button.

## Verification
- Test browser launch with `playwright-core` pointing to installed Chrome/Edge.
- Run end-to-end task queue test verifying title, description (with Urdu/English/emojis), thumbnail, and dry-run publishing.
