const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const lanServer = require('./lanServer');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#07060a',
    title: 'Apex Brawl: Mystic Kombat',
    autoHideMenuBar: true,
    show: false, // show when ready-to-show to prevent flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message} (${sourceId}:${line})`);
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    lanServer.stopHost();
    lanServer.stopDiscovery();
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  lanServer.stopHost();
  lanServer.stopDiscovery();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// -----------------------------------------------------------------------------
// IPC Communication Handlers
// -----------------------------------------------------------------------------
ipcMain.on('game:quit', () => {
  lanServer.stopHost();
  lanServer.stopDiscovery();
  app.quit();
});

ipcMain.handle('game:toggle-fullscreen', () => {
  if (mainWindow) {
    const isFull = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFull);
    return !isFull;
  }
  return false;
});

ipcMain.handle('game:is-fullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

// --- LAN Multiplayer IPC Endpoints ---
ipcMain.handle('lan:get-local-ip', async () => {
  return lanServer.getLocalIP();
});

ipcMain.handle('lan:start-host', async (event, port = 8765) => {
  return await lanServer.startHost(port);
});

ipcMain.handle('lan:stop-host', async () => {
  lanServer.stopHost();
  return { success: true };
});

ipcMain.handle('lan:start-discovery', async () => {
  lanServer.startDiscovery((hostInfo) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('lan:host-discovered', hostInfo);
    }
  });
  return { success: true };
});

ipcMain.handle('lan:stop-discovery', async () => {
  lanServer.stopDiscovery();
  return { success: true };
});
