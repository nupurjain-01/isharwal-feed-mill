const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Enable hardware acceleration and media device support
app.commandLine.appendSwitch('enable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');

let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = process.env.PORT || 5050;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// Helper: Check if backend server is already reachable
function checkServerReady(timeout = 15000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      http.get(`${SERVER_URL}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', () => {
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startTime > timeout) {
        resolve(false);
      } else {
        setTimeout(check, 400);
      }
    };

    check();
  });
}

// Start backend Express server process
function startServer() {
  const serverScript = path.join(__dirname, '../server/server.js');
  console.log('[Electron] Starting background API server:', serverScript);

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(SERVER_PORT),
    NODE_ENV: 'production'
  };

  try {
    serverProcess = spawn(process.execPath, [serverScript], {
      cwd: path.join(__dirname, '../server'),
      env,
      stdio: 'ignore'
    });

    serverProcess.on('error', (err) => {
      console.error('[Electron] Failed to start server with process.execPath, trying node fallback:', err);
      try {
        serverProcess = spawn('node', [serverScript], {
          cwd: path.join(__dirname, '../server'),
          env,
          stdio: 'ignore'
        });
      } catch (e) {
        console.error('[Electron] Node fallback error:', e);
      }
    });
  } catch (e) {
    console.error('[Electron] Server spawn error:', e);
  }
}

async function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Isharwal Feed Mill — Gate Entry Management System',
    icon: iconPath,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.maximize();

  // Check if server is already running, otherwise launch it
  const alreadyRunning = await checkServerReady(1000);
  if (!alreadyRunning) {
    startServer();
    const ready = await checkServerReady(15000);
    if (!ready) {
      console.warn('[Electron] Backend server took longer than expected.');
    }
  }

  // Load the application
  try {
    await mainWindow.loadURL(SERVER_URL);
  } catch (err) {
    console.error('[Electron] Failed to load URL immediately, retrying in 1.5s:', err);
    setTimeout(() => {
      mainWindow?.loadURL(SERVER_URL).catch(() => {});
    }, 1500);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  // Fallback show
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 1000);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Native IPC Print Support
ipcMain.handle('print-page', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'No active window' };

  return new Promise((resolve) => {
    mainWindow.webContents.print(
      {
        silent: options.silent || false,
        printBackground: true,
        deviceName: options.deviceName || '',
        margins: { marginType: 'none' }
      },
      (success, failureReason) => {
        if (!success) {
          resolve({ success: false, error: failureReason });
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});

ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  return await mainWindow.webContents.getPrintersAsync();
});

// App Lifecycle & Camera Permission Setup
app.whenReady().then(() => {
  // Automatically grant camera and microphone access to the desktop window
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'camera', 'microphone', 'notifications', 'mediaKeySystem'];
    if (allowed.includes(permission)) {
      return callback(true);
    }
    callback(true);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return true;
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {
      // ignore
    }
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
