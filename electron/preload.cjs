const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras de hardware o entorno
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  duckBackgroundAudio: (level) => ipcRenderer.invoke('audio:duck', level),
  unduckBackgroundAudio: () => ipcRenderer.invoke('audio:unduck'),
});
