const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  platform: process.platform,
  isDesktop: true,
  version: '1.0.0',
  appName: 'AI YouTube Automation OS'
});
