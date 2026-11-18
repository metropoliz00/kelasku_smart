const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');

let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch {
  autoUpdater = null;
}

const APP_ID = 'id.sch.kelaskusmart.desktop';
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID);
}

let mainWindow = null;

function getUserConfigPath() {
  return path.join(app.getPath('userData'), 'kelasku-config.json');
}

function getExecutableDir() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }
  return app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..');
}

function readSidecarGasUrl() {
  const exeDir = getExecutableDir();
  const txtPath = path.join(exeDir, 'appscript-url.txt');
  if (fs.existsSync(txtPath)) {
    try {
      const content = fs.readFileSync(txtPath, 'utf8').trim();
      const firstLine = content.split(/\r?\n/)[0]?.trim() || '';
      if (/^https?:\/\//i.test(firstLine)) {
        return { url: firstLine, sourcePath: txtPath };
      }
    } catch {
      // ignore read errors
    }
  }

  const jsonPath = path.join(exeDir, 'gas-config.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const url = String(parsed.GAS_WEB_APP_URL || parsed.gasUrl || parsed.url || '').trim();
      if (/^https?:\/\//i.test(url)) {
        return { url, sourcePath: jsonPath };
      }
    } catch {
      // ignore parse errors
    }
  }

  return { url: '', sourcePath: txtPath };
}

function readDesktopConfig() {
  const cfgPath = getUserConfigPath();
  let saved = {};
  if (fs.existsSync(cfgPath)) {
    try {
      saved = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) || {};
    } catch {
      saved = {};
    }
  }

  const sidecar = readSidecarGasUrl();
  const gasUrl = typeof saved.gasUrl === 'string' && saved.gasUrl.trim()
    ? saved.gasUrl.trim()
    : sidecar.url;

  return {
    gasUrl,
    localMode: Boolean(saved.localMode) && !gasUrl,
    configPath: cfgPath,
    externalUrlFilePath: sidecar.sourcePath,
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged,
  };
}

function writeDesktopConfig(patch) {
  const cfgPath = getUserConfigPath();
  let current = {};
  if (fs.existsSync(cfgPath)) {
    try {
      current = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) || {};
    } catch {
      current = {};
    }
  }
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(cfgPath, JSON.stringify(next, null, 2), 'utf8');
  return readDesktopConfig();
}

function sendUpdateStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('kelasku:update-status', payload);
  }
}

function hasAutoUpdateFeed() {
  if (!app.isPackaged || !autoUpdater) return false;
  const updateConfigPath = path.join(process.resourcesPath, 'app-update.yml');
  return fs.existsSync(updateConfigPath);
}

function setupAutoUpdater() {
  if (!autoUpdater) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({
      status: 'checking',
      message: 'Memeriksa pembaruan aplikasi terbaru...',
    });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      status: 'available',
      version: info?.version || '',
      message: `Versi baru v${info?.version || ''} tersedia. Sedang mengunduh pembaruan...`,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus({
      status: 'not-available',
      version: info?.version || app.getVersion(),
      message: `Aplikasi sudah versi terbaru (v${app.getVersion()}).`,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      status: 'progress',
      percent: Math.round(progress?.percent || 0),
      message: `Mengunduh pembaruan (${Math.round(progress?.percent || 0)}%)...`,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({
      status: 'downloaded',
      version: info?.version || '',
      message: `Pembaruan v${info?.version || ''} siap dipasang. Klik untuk mulai ulang aplikasi.`,
    });
  });

  autoUpdater.on('error', (err) => {
    sendUpdateStatus({
      status: 'error',
      message: err?.message ? `Gagal memeriksa pembaruan: ${err.message}` : 'Gagal memeriksa pembaruan.',
    });
  });

  if (hasAutoUpdateFeed()) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 3500);

    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 4 * 60 * 60 * 1000);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, 'icon.png');
  mainWindow = new BrowserWindow({
    title: 'KELASKU SMART — School Management Platform',
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const devUrl = process.env.ELECTRON_DEV_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    ipcMain.on('kelasku:get-runtime-config', (event) => {
      event.returnValue = readDesktopConfig();
    });

    ipcMain.handle('kelasku:get-gas-url', () => readDesktopConfig().gasUrl);

    ipcMain.handle('kelasku:set-gas-url', (_event, url) => {
      const clean = String(url || '').trim();
      const next = writeDesktopConfig({ gasUrl: clean, localMode: false });
      return next.gasUrl;
    });

    ipcMain.handle('kelasku:set-local-mode', (_event, enabled) => {
      const isLocal = Boolean(enabled);
      const next = writeDesktopConfig({
        localMode: isLocal,
        gasUrl: isLocal ? '' : readDesktopConfig().gasUrl,
      });
      return next;
    });

    ipcMain.handle('kelasku:reset-gas-url', () => {
      const next = writeDesktopConfig({ gasUrl: '', localMode: false });
      return next.gasUrl;
    });

    ipcMain.handle('kelasku:open-external', async (_event, url) => {
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
        await shell.openExternal(url);
        return true;
      }
      return false;
    });

    ipcMain.handle('kelasku:check-updates', async () => {
      if (!app.isPackaged) {
        const payload = {
          status: 'error',
          message: 'Pemeriksaan pembaruan otomatis hanya aktif pada file .exe hasil build rilis.',
        };
        sendUpdateStatus(payload);
        return payload;
      }
      if (!hasAutoUpdateFeed()) {
        const payload = {
          status: 'error',
          message: 'Konfigurasi feed pembaruan belum tersedia pada paket rilis ini.',
        };
        sendUpdateStatus(payload);
        return payload;
      }
      try {
        await autoUpdater.checkForUpdates();
        return { status: 'checking' };
      } catch (err) {
        const payload = {
          status: 'error',
          message: err?.message ? `Gagal memeriksa pembaruan: ${err.message}` : 'Gagal memeriksa pembaruan.',
        };
        sendUpdateStatus(payload);
        return payload;
      }
    });

    ipcMain.handle('kelasku:install-update', () => {
      if (autoUpdater && app.isPackaged) {
        autoUpdater.quitAndInstall(false, true);
        return true;
      }
      return false;
    });

    createWindow();
    setupAutoUpdater();

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
}
