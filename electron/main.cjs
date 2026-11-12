const { app, BrowserWindow, shell, ipcMain, session } = require('electron');
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
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true, // Ocultar barras de menú de navegador
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true, // Sandbox de Chromium activado
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

  // Guarda estricta de navegación: Prevenir redirecciones externas dentro del frame principal
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      if (parsed.protocol === 'file:') return;
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return;

      event.preventDefault();
      if (
        navigationUrl.startsWith('https://wa.me') ||
        navigationUrl.startsWith('https://api.whatsapp.com')
      ) {
        shell.openExternal(navigationUrl);
      }
    } catch {
      event.preventDefault();
    }
  });

  // Abrir enlaces externos (como WhatsApp wa.me) estrictamente en el navegador predeterminado del sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.startsWith('https://wa.me') ||
      url.startsWith('https://api.whatsapp.com') ||
      url.startsWith('http:') ||
      url.startsWith('https:')
    ) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
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
    // Configurar permisos para perifoneo y micrófono en vivo hacia el parlante Bluetooth
    if (session && session.defaultSession) {
      session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
        if (permission === 'media' || permission === 'audioCapture') {
          return callback(true);
        }
        callback(false);
      });

      if (typeof session.defaultSession.setPermissionCheckHandler === 'function') {
        session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
          if (permission === 'media' || permission === 'audioCapture') {
            return true;
          }
          return false;
        });
      }
    }

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
