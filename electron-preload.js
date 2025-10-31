const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  startApp: () => ipcRenderer.invoke("start-app"),
  stopApp: () => ipcRenderer.invoke("stop-app"),
  createBackup: () => ipcRenderer.invoke("create-backup"),
  getNetworkInterfaces: () => ipcRenderer.invoke("get-network-interfaces"),
  onBackendOutput: (callback) =>
    ipcRenderer.on("backend-output", (event, data) => callback(data)),
  onBackendError: (callback) =>
    ipcRenderer.on("backend-error", (event, data) => callback(data)),
  onFrontendOutput: (callback) =>
    ipcRenderer.on("frontend-output", (event, data) => callback(data)),
  onFrontendError: (callback) =>
    ipcRenderer.on("frontend-error", (event, data) => callback(data)),
  onBackupOutput: (callback) =>
    ipcRenderer.on("backup-output", (event, data) => callback(data)),
  onBackupError: (callback) =>
    ipcRenderer.on("backup-error", (event, data) => callback(data)),
  onBackupScheduleOutput: (callback) =>
    ipcRenderer.on("backup-schedule-output", (event, data) => callback(data)),
  onBackupScheduleError: (callback) =>
    ipcRenderer.on("backup-schedule-error", (event, data) => callback(data)),
});
