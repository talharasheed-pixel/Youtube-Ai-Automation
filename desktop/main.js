const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, shell, dialog } = require('electron');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION — Live 24/7 Cloud Backend on Render
// ═══════════════════════════════════════════════════════════════
const BACKEND_URL = process.env.BACKEND_URL || 'https://youtube-ai-automation-h7wx.onrender.com';
const API_URL = process.env.API_URL || 'https://youtube-ai-automation-h7wx.onrender.com';

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'AI YouTube Automation OS',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#0a0a0f',
    autoHideMenuBar: true,
    show: false, // Show after ready-to-show
    titleBarStyle: 'default'
  });

  // Show splash then load
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.loadURL(BACKEND_URL);

  // Handle external links — open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      if (Notification.isSupported()) {
        new Notification({
          title: 'AI YouTube Automation OS',
          body: '🎬 Minimized to system tray. Your AI agents continue working in the cloud.',
          icon: path.join(__dirname, 'icon.png')
        }).show();
      }
    }
    return false;
  });

  // Handle load failures gracefully
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });
}

function createTray() {
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'));
    if (trayIcon.isEmpty()) {
      // Create a simple fallback icon
      trayIcon = nativeImage.createEmpty();
    }
  } catch (e) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('AI YouTube Automation OS — 10 Agents Active');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🎬 Open Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '📊 System Health',
      click: () => {
        if (mainWindow) {
          mainWindow.loadURL(`${BACKEND_URL}/system`);
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '🤖 Active Agents',
      click: () => {
        if (mainWindow) {
          mainWindow.loadURL(`${BACKEND_URL}/agents`);
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: '⚙️ Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.loadURL(`${BACKEND_URL}/settings`);
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: '❌ Quit Application',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// APPLICATION LIFECYCLE
// ═══════════════════════════════════════════════════════════════

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Periodic health check notification (every 30 minutes)
  setInterval(async () => {
    try {
      const res = await fetch(`${API_URL}/api/system/health`);
      const data = await res.json();
      if (data.status !== 'ONLINE' && Notification.isSupported()) {
        new Notification({
          title: '⚠️ AI YouTube OS - System Alert',
          body: `System status: ${data.status}. Check the dashboard for details.`
        }).show();
      }
    } catch (e) {
      // Backend offline — don't spam notifications
    }
  }, 30 * 60 * 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit — stay in tray
  }
});

// Single instance lock — prevent multiple windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
