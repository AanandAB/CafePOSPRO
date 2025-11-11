const { contextBridge, ipcRenderer } = require("electron");

// Safe wrapper for IPC calls that might not be available
const safeInvoke = async (channel, ...args) => {
  try {
    return await ipcRenderer.invoke(channel, ...args);
  } catch (error) {
    console.warn(`IPC call to ${channel} failed:`, error);
    return { success: false, message: error.message };
  }
};

contextBridge.exposeInMainWorld("electronAPI", {
  startApp: () => safeInvoke("start-app"),
  stopApp: () => safeInvoke("stop-app"),
  createBackup: () => safeInvoke("create-backup"),
  getNetworkInterfaces: () => safeInvoke("get-network-interfaces"),
  executePythonScript: () => safeInvoke("execute-python-script"),
  executePowerShellScript: () => safeInvoke("execute-powershell-script"),
  onBackendOutput: (callback) => {
    try {
      return ipcRenderer.on("backend-output", (event, data) => callback(data));
    } catch (error) {
      console.warn("Failed to register backend output listener:", error);
    }
  },
  onBackendError: (callback) => {
    try {
      return ipcRenderer.on("backend-error", (event, data) => callback(data));
    } catch (error) {
      console.warn("Failed to register backend error listener:", error);
    }
  },
  onFrontendOutput: (callback) => {
    try {
      return ipcRenderer.on("frontend-output", (event, data) => callback(data));
    } catch (error) {
      console.warn("Failed to register frontend output listener:", error);
    }
  },
  onFrontendError: (callback) => {
    try {
      return ipcRenderer.on("frontend-error", (event, data) => callback(data));
    } catch (error) {
      console.warn("Failed to register frontend error listener:", error);
    }
  },
  onBackupOutput: (callback) => {
    try {
      return ipcRenderer.on("backup-output", (event, data) => callback(data));
    } catch (error) {
      console.warn("Failed to register backup output listener:", error);
    }
  },
  onBackupError: (callback) => {
    try {
      return ipcRenderer.on("backup-error", (event, data) => callback(data));
    } catch (error) {
      console.warn("Failed to register backup error listener:", error);
    }
  },
  onBackupScheduleOutput: (callback) => {
    try {
      return ipcRenderer.on("backup-schedule-output", (event, data) =>
        callback(data)
      );
    } catch (error) {
      console.warn(
        "Failed to register backup schedule output listener:",
        error
      );
    }
  },
  onBackupScheduleError: (callback) => {
    try {
      return ipcRenderer.on("backup-schedule-error", (event, data) =>
        callback(data)
      );
    } catch (error) {
      console.warn("Failed to register backup schedule error listener:", error);
    }
  },
});
