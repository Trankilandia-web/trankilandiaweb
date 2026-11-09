const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras de hardware o entorno si se requieren
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
});
