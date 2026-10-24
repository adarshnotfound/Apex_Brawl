const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  quit: () => ipcRenderer.send('game:quit'),
  toggleFullscreen: () => ipcRenderer.invoke('game:toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('game:is-fullscreen'),
  platform: process.platform
});
