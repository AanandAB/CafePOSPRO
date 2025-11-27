const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  checkNodeJS: () => ipcRenderer.invoke('check-nodejs'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  saveData: (data, filename) => ipcRenderer.invoke('save-data', data, filename),
  loadData: (filename) => ipcRenderer.invoke('load-data', filename),
  // Add more API methods here as needed
});