const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const lanServer = require('./lanServer');
const MobileControllerServer = require('./mobileServer');

let mainWindow;
let mobileServer = null;
let isQuitting = false;

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
    // Start Mobile Controller Server
    try {
      mobileServer = new MobileControllerServer(mainWindow, 3000);
      mobileServer.start();
    } catch (err) {
      console.error('[Mobile Server Start Error]', err);
    }
  });

  mainWindow.on('closed', () => {
    lanServer.stopHost();
    lanServer.stopDiscovery();
    if (mobileServer) {
      mobileServer.stop();
      mobileServer = null;
    }
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (!isQuitting && BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  isQuitting = true;
  try {
    lanServer.stopHost();
    lanServer.stopDiscovery();
    if (mobileServer) {
      mobileServer.stop();
      mobileServer = null;
    }
  } catch (e) {}
  app.exit(0);
});

// -----------------------------------------------------------------------------
// IPC Communication Handlers
// -----------------------------------------------------------------------------
ipcMain.on('game:quit', () => {
  isQuitting = true;
  try {
    lanServer.stopHost();
    lanServer.stopDiscovery();
    if (mobileServer) {
      mobileServer.stop();
      mobileServer = null;
    }
  } catch (err) {
    console.error('[LAN/Mobile Stop Error]', err);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }
  app.exit(0);
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

// --- Mobile Controller IPC Endpoints ---
ipcMain.handle('mobile:get-info', async () => {
  if (mobileServer) {
    return await mobileServer.getInfoWithQR();
  }
  return null;
});
