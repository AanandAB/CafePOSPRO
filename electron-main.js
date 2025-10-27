const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

let mainWindow;
let backendProcess;
let frontendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "src/assets/icon.png"),
  });

  mainWindow.loadFile("electron-ui.html");

  // Open dev tools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Kill child processes when app closes
    if (backendProcess) {
      backendProcess.kill();
    }
    if (frontendProcess) {
      frontendProcess.kill();
    }
    app.quit();
  }
});

// IPC handlers for starting/stopping the application
ipcMain.handle("start-app", async () => {
  try {
    // Start backend (Convex dev)
    backendProcess = spawn("npx", ["convex", "dev"], {
      cwd: __dirname,
      shell: true,
    });

    backendProcess.stdout.on("data", (data) => {
      console.log(`Backend: ${data}`);
      mainWindow.webContents.send("backend-output", data.toString());
    });

    backendProcess.stderr.on("data", (data) => {
      console.error(`Backend Error: ${data}`);
      mainWindow.webContents.send("backend-error", data.toString());
    });

    // Start frontend (Vite)
    frontendProcess = spawn("npm", ["run", "dev:frontend"], {
      cwd: __dirname,
      shell: true,
    });

    frontendProcess.stdout.on("data", (data) => {
      console.log(`Frontend: ${data}`);
      mainWindow.webContents.send("frontend-output", data.toString());
    });

    frontendProcess.stderr.on("data", (data) => {
      console.error(`Frontend Error: ${data}`);
      mainWindow.webContents.send("frontend-error", data.toString());
    });

    return { success: true, message: "Application started successfully" };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("stop-app", async () => {
  try {
    if (backendProcess) {
      backendProcess.kill();
      backendProcess = null;
    }
    if (frontendProcess) {
      frontendProcess.kill();
      frontendProcess = null;
    }
    return { success: true, message: "Application stopped successfully" };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// IPC handler for backup
ipcMain.handle("create-backup", async () => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Save Backup",
      defaultPath: `cafepospro-backup-${new Date().toISOString().split("T")[0]}.sql`,
      filters: [
        { name: "SQL Files", extensions: ["sql"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (!filePath) {
      return { success: false, message: "Backup cancelled" };
    }

    // Run our backup script
    const backupProcess = spawn("npm", ["run", "db:backup", filePath], {
      cwd: __dirname,
      shell: true,
    });

    let output = "";
    let errorOutput = "";

    backupProcess.stdout.on("data", (data) => {
      output += data.toString();
      mainWindow.webContents.send("backup-output", data.toString());
    });

    backupProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
      mainWindow.webContents.send("backup-error", data.toString());
    });

    return new Promise((resolve) => {
      backupProcess.on("close", (code) => {
        if (code === 0) {
          resolve({
            success: true,
            message: `Backup created successfully at ${filePath}`,
          });
        } else {
          resolve({
            success: false,
            message: `Backup failed: ${errorOutput || "Unknown error"}`,
          });
        }
      });
    });
  } catch (error) {
    return { success: false, message: `Backup failed: ${error.message}` };
  }
});

// Add this new IPC handler for getting network interfaces
ipcMain.handle("get-network-interfaces", async () => {
  try {
    const networkInterfaces = os.networkInterfaces();
    const ipAddresses = [];

    // Extract IP addresses from all network interfaces
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      for (const iface of interfaces) {
        // Skip internal (loopback) and IPv6 addresses
        if (!iface.internal && iface.family === "IPv4") {
          ipAddresses.push(iface.address);
        }
      }
    }

    return { success: true, interfaces: ipAddresses };
  } catch (error) {
    return { success: false, message: error.message };
  }
});
