const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  printPage: (options) => ipcRenderer.invoke('print-page', options),
  getPrinters: () => ipcRenderer.invoke('get-printers')
});
