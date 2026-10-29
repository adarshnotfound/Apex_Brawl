const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  quit: () => ipcRenderer.send('game:quit'),
  toggleFullscreen: () => ipcRenderer.invoke('game:toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('game:is-fullscreen'),
  platform: process.platform,

  // LAN Multiplayer APIs
  getLocalIP: () => ipcRenderer.invoke('lan:get-local-ip'),
  startHostServer: (port) => ipcRenderer.invoke('lan:start-host', port),
  stopHostServer: () => ipcRenderer.invoke('lan:stop-host'),
  startDiscovery: () => ipcRenderer.invoke('lan:start-discovery'),
  stopDiscovery: () => ipcRenderer.invoke('lan:stop-discovery'),
  onHostDiscovered: (callback) => {
    ipcRenderer.removeAllListeners('lan:host-discovered');
    ipcRenderer.on('lan:host-discovered', (event, hostInfo) => callback(hostInfo));
  }
});
