import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, Notification } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 820,
    minWidth: 440,
    minHeight: 560,
    frame: true,
    titleBarStyle: 'hiddenInset',
    transparent: false,
    backgroundColor: '#f1f4f8',
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // allow loading local assets & CORS RSS feeds
    },
  });

  // Automatically grant microphone and media permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const permStr = permission as string;
    if (permStr === 'media' || permStr === 'microphone' || permStr === 'notifications') {
      callback(true);
    } else {
      callback(true);
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerShortcuts() {
  // Global summon shortcut: Option+Shift+N (Command+Alt+N on Mac)
  globalShortcut.register('Alt+Shift+N', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
      mainWindow.webContents.send('shortcut:summon');
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC Event Handlers
ipcMain.on('window:set-always-on-top', (_, alwaysOnTop: boolean) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(alwaysOnTop, 'floating');
  }
});

ipcMain.on('window:set-size', (_, { width, height }: { width: number; height: number }) => {
  if (mainWindow) {
    mainWindow.setSize(width, height);
  }
});

ipcMain.on('window:minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('app:notification', (_, { title, body }: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});
