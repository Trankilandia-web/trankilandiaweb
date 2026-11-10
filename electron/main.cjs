const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');

// Bloqueo de instancia única (evita abrir múltiples ventanas del sistema en la recepción)
const gotTheLock = app.requestSingleInstanceLock();

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Trankilandia Gym · Central Hub Operativo',
    backgroundColor: '#09090b',
    autoHideMenuBar: true, // Ocultar barras de menú de navegador
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Asegurar que preload se ejecute limpiamente en Windows
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.maximize();

  // Marcar User-Agent de aplicación de escritorio oficial
  const baseUA = mainWindow.webContents.getUserAgent();
  mainWindow.webContents.setUserAgent(`${baseUA} TrankilandiaDesktopApp/1.0 Electron`);

  // Asegurar título formal de la aplicación
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.setTitle('Trankilandia Gym · Central Hub Operativo');
  });

  // Abrir enlaces externos (como WhatsApp wa.me) en el navegador predeterminado del sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://wa.me') || url.startsWith('https://api.whatsapp.com') || url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173/#/';

  if (isDev) {
    mainWindow.loadURL(devUrl);
  } else {
    // En producción de escritorio, cargar directamente la Terminal de Personal
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: '/',
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Si intentan abrir una segunda ventana, enfocar la existente
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
