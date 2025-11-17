const { app, BrowserWindow, ipcMain, dialog } = require("electron");

const { spawn, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

let mainWindow;
let backendProcess;
let frontendProcess;
let scheduledBackupProcess;

// Function to check if a command exists
function commandExists(command) {
  try {
    console.log(`Checking if command exists: ${command}`);
    const which = process.platform === "win32" ? "where" : "which";
    console.log(`Using which command: ${which}`);

    // For packaged apps, we need to be more careful
    const options = {
      shell: true,
      windowsHide: true,
      stdio: ["pipe", "pipe", "ignore"], // Ignore stderr to prevent errors
    };

    const result = spawnSync(which, [command], options);
    console.log(
      `Command check result for ${command}: status=${result.status}, error=${result.error}`
    );
    return result.status === 0;
  } catch (error) {
    console.warn(
      `Error checking if command exists (${command}):`,
      error.message
    );
    return false;
  }
}

// Safe spawn function that handles cmd.exe issues
function safeSpawn(command, args, options = {}) {
  try {
    // Set default options for better compatibility
    const spawnOptions = {
      shell: true,
      windowsHide: true,
      ...options,
    };

    // For packaged apps, ensure we have the right environment
    if (app.isPackaged) {
      // Make sure we have the system PATH
      if (!spawnOptions.env) {
        spawnOptions.env = process.env;
      }

      // Ensure COMSPEC is set
      if (!spawnOptions.env.COMSPEC) {
        spawnOptions.env.COMSPEC = "C:\\WINDOWS\\system32\\cmd.exe";
      }

      // Ensure SystemRoot is set
      if (!spawnOptions.env.SystemRoot) {
        spawnOptions.env.SystemRoot = "C:\\WINDOWS";
      }
    }

    console.log(`Spawning process: ${command} ${args ? args.join(" ") : ""}`);
    console.log(`Spawn options:`, JSON.stringify(spawnOptions));

    // Log environment info
    console.log(`Process platform: ${process.platform}`);
    console.log(`Process arch: ${process.arch}`);
    console.log(`COMSPEC: ${process.env.COMSPEC || "Not set"}`);
    console.log(`SystemRoot: ${process.env.SystemRoot || "Not set"}`);
    console.log(
      `PATH length: ${process.env.PATH ? process.env.PATH.length : "Not set"}`
    );
    console.log(`App is packaged: ${app.isPackaged}`);

    // Try to spawn the process
    const processInstance = spawn(command, args || [], spawnOptions);

    // Log spawn events
    processInstance.on("error", (error) => {
      console.error(`Process spawn error for ${command}:`, error);
      console.error(`Error code: ${error.code}`);
      console.error(`Error errno: ${error.errno}`);
      console.error(`Error syscall: ${error.syscall}`);
      console.error(`Error path: ${error.path}`);
      console.error(`Error spawnargs: ${error.spawnargs}`);
    });

    processInstance.on("close", (code) => {
      console.log(`Process ${command} closed with code: ${code}`);
    });

    return processInstance;
  } catch (error) {
    console.error(`Failed to spawn process (${command}):`, error);
    throw error;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "electron-preload.js"),
    },
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

  // Start scheduled backup system
  startScheduledBackups();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Kill child processes when app closes
    if (backendProcess) {
      try {
        backendProcess.kill();
      } catch (e) {
        console.log("Error killing backend process:", e);
      }
    }
    if (frontendProcess) {
      try {
        frontendProcess.kill();
      } catch (e) {
        console.log("Error killing frontend process:", e);
      }
    }
    if (scheduledBackupProcess) {
      try {
        scheduledBackupProcess.kill();
      } catch (e) {
        console.log("Error killing scheduled backup process:", e);
      }
    }
    app.quit();
  }
});

// Function to get network interfaces
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and IPv6 addresses
      if (!iface.internal && iface.family === "IPv4") {
        addresses.push(iface.address); // Return just the IP address, not the full URL
      }
    }
  }

  // Add localhost as fallback
  addresses.push("localhost");

  return addresses;
}

// Function to execute Python script
async function executePythonScript() {
  try {
    const pythonPath = process.platform === "win32" ? "python" : "python3";
    const scriptPath = path.join(__dirname, "scripts", "get_local_ip.py");

    // Check if Python is available
    if (!commandExists(pythonPath)) {
      throw new Error(`${pythonPath} not found in PATH`);
    }

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Python script not found at ${scriptPath}`);
    }

    const pythonProcess = safeSpawn(pythonPath, [scriptPath], {
      cwd: __dirname,
    });

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    return new Promise((resolve, reject) => {
      pythonProcess.on("close", (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            resolve(result);
          } catch (parseError) {
            reject(
              new Error(
                `Failed to parse Python script output: ${parseError.message}`
              )
            );
          }
        } else {
          reject(
            new Error(
              `Python script failed with exit code ${code}: ${errorOutput}`
            )
          );
        }
      });
    });
  } catch (error) {
    throw new Error(`Failed to execute Python script: ${error.message}`);
  }
}

// Function to execute PowerShell script
async function executePowerShellScript() {
  try {
    const scriptPath = path.join(__dirname, "scripts", "get_local_ip.ps1");

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`PowerShell script not found at ${scriptPath}`);
    }

    const psProcess = safeSpawn(
      "powershell",
      ["-ExecutionPolicy", "Bypass", "-File", scriptPath],
      {
        cwd: __dirname,
      }
    );

    let output = "";
    let errorOutput = "";

    psProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    psProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    return new Promise((resolve, reject) => {
      psProcess.on("close", (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            resolve(result);
          } catch (parseError) {
            reject(
              new Error(
                `Failed to parse PowerShell script output: ${parseError.message}`
              )
            );
          }
        } else {
          reject(
            new Error(
              `PowerShell script failed with exit code ${code}: ${errorOutput}`
            )
          );
        }
      });
    });
  } catch (error) {
    throw new Error(`Failed to execute PowerShell script: ${error.message}`);
  }
}

// Start scheduled backup system
function startScheduledBackups() {
  try {
    console.log("Starting scheduled backups...");

    // Check if node is available before trying to spawn
    const nodeAvailable = commandExists("node");
    console.log(`Node available: ${nodeAvailable}`);

    if (!nodeAvailable) {
      console.warn("Node.js not found in PATH, scheduled backups will not run");
      if (mainWindow) {
        mainWindow.webContents.send(
          "backup-schedule-error",
          "Node.js not found in PATH. Scheduled backups will not run."
        );
      }
      return;
    }

    // For packaged apps, we need to use the correct path to the script
    let scriptPath = "scripts/scheduled-backup.cjs";
    if (app.isPackaged) {
      // In packaged app, scripts are in the resources folder
      scriptPath = path.join(
        process.resourcesPath,
        "scripts",
        "scheduled-backup.cjs"
      );
      console.log(`Using packaged script path: ${scriptPath}`);

      // Check if the script exists
      if (!fs.existsSync(scriptPath)) {
        console.error(`Scheduled backup script not found at: ${scriptPath}`);
        // Try alternative path
        scriptPath = path.join(
          process.resourcesPath,
          "app.asar.unpacked",
          "scripts",
          "scheduled-backup.cjs"
        );
        console.log(`Trying alternative path: ${scriptPath}`);

        if (!fs.existsSync(scriptPath)) {
          console.error(
            `Scheduled backup script not found at alternative path: ${scriptPath}`
          );
          scriptPath = path.join(__dirname, "scripts", "scheduled-backup.cjs");
          console.log(`Falling back to development path: ${scriptPath}`);
        }
      }
    } else {
      scriptPath = path.join(__dirname, "scripts", "scheduled-backup.cjs");
      console.log(`Using development script path: ${scriptPath}`);
    }

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`Scheduled backup script not found at: ${scriptPath}`);
      if (mainWindow) {
        mainWindow.webContents.send(
          "backup-schedule-error",
          `Scheduled backup script not found at: ${scriptPath}`
        );
      }
      return;
    }

    // Escape the script path for Windows
    const escapedScriptPath = `"${scriptPath}"`;

    scheduledBackupProcess = safeSpawn("node", [escapedScriptPath], {
      cwd: app.isPackaged ? process.resourcesPath : __dirname,
    });

    scheduledBackupProcess.stdout.on("data", (data) => {
      console.log(`[Scheduled Backup] ${data}`);
      if (mainWindow) {
        mainWindow.webContents.send("backup-schedule-output", data.toString());
      }
    });

    scheduledBackupProcess.stderr.on("data", (data) => {
      console.error(`[Scheduled Backup Error] ${data}`);
      if (mainWindow) {
        mainWindow.webContents.send("backup-schedule-error", data.toString());
      }
    });
  } catch (error) {
    console.error("Failed to start scheduled backup process:", error);
    if (mainWindow) {
      mainWindow.webContents.send(
        "backup-schedule-error",
        `Failed to start scheduled backup process: ${error.message}`
      );
    }
  }
}

// IPC handlers for starting/stopping the application
ipcMain.handle("start-app", async () => {
  try {
    // Start backend (Convex dev) - with error handling
    try {
      const npxAvailable = commandExists("npx");
      if (!npxAvailable) {
        console.warn("npx not found in PATH, backend will not start");
        if (mainWindow) {
          mainWindow.webContents.send(
            "backend-error",
            "npx not found in PATH. Backend will not start."
          );
        }
      } else {
        backendProcess = safeSpawn("npx", ["convex", "dev"], {
          cwd: __dirname,
        });

        backendProcess.stdout.on("data", (data) => {
          console.log(`Backend: ${data}`);
          if (mainWindow) {
            mainWindow.webContents.send("backend-output", data.toString());
          }
        });

        backendProcess.stderr.on("data", (data) => {
          console.error(`Backend Error: ${data}`);
          if (mainWindow) {
            mainWindow.webContents.send("backend-error", data.toString());
          }
        });
      }
    } catch (backendError) {
      console.error("Failed to start backend process:", backendError);
      if (mainWindow) {
        mainWindow.webContents.send(
          "backend-error",
          `Failed to start backend: ${backendError.message}`
        );
      }
    }

    // Start frontend (Vite) - with error handling
    try {
      const npmAvailable = commandExists("npm");
      if (!npmAvailable) {
        console.warn("npm not found in PATH, frontend will not start");
        if (mainWindow) {
          mainWindow.webContents.send(
            "frontend-error",
            "npm not found in PATH. Frontend will not start."
          );
        }
      } else {
        frontendProcess = safeSpawn("npm", ["run", "dev:frontend"], {
          cwd: __dirname,
        });

        frontendProcess.stdout.on("data", (data) => {
          console.log(`Frontend: ${data}`);
          if (mainWindow) {
            mainWindow.webContents.send("frontend-output", data.toString());
          }
        });

        frontendProcess.stderr.on("data", (data) => {
          console.error(`Frontend Error: ${data}`);
          if (mainWindow) {
            mainWindow.webContents.send("frontend-error", data.toString());
          }
        });
      }
    } catch (frontendError) {
      console.error("Failed to start frontend process:", frontendError);
      if (mainWindow) {
        mainWindow.webContents.send(
          "frontend-error",
          `Failed to start frontend: ${frontendError.message}`
        );
      }
    }

    return { success: true, message: "Application started successfully" };
  } catch (error) {
    console.error("Error starting application:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("stop-app", async () => {
  try {
    if (backendProcess) {
      try {
        backendProcess.kill();
      } catch (e) {
        console.log("Error killing backend process:", e);
      }
      backendProcess = null;
    }
    if (frontendProcess) {
      try {
        frontendProcess.kill();
      } catch (e) {
        console.log("Error killing frontend process:", e);
      }
      frontendProcess = null;
    }
    return { success: true, message: "Application stopped successfully" };
  } catch (error) {
    console.error("Error stopping application:", error);
    return { success: false, message: error.message };
  }
});

// IPC handler to execute Python script
ipcMain.handle("execute-python-script", async () => {
  try {
    const result = await executePythonScript();
    return { success: true, ...result };
  } catch (error) {
    console.error("Error executing Python script:", error);
    return { success: false, message: error.message };
  }
});

// IPC handler to execute PowerShell script
ipcMain.handle("execute-powershell-script", async () => {
  try {
    const result = await executePowerShellScript();
    return { success: true, ...result };
  } catch (error) {
    console.error("Error executing PowerShell script:", error);
    return { success: false, message: error.message };
  }
});

// IPC handler to get network interfaces
ipcMain.handle("get-network-interfaces", async () => {
  try {
    const networkInterfaces = os.networkInterfaces();
    const ipAddresses = [];
    let wifiIP = null;

    // Extract IP addresses from all network interfaces, prioritizing wireless interfaces
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      // Check if this is a wireless interface (prioritize Wi-Fi, wlan, wireless)
      const isWireless =
        interfaceName.toLowerCase().includes("wi-fi") ||
        interfaceName.toLowerCase().includes("wlan") ||
        interfaceName.toLowerCase().includes("wireless");

      for (const iface of interfaces) {
        // Skip internal (loopback) and IPv6 addresses
        if (!iface.internal && iface.family === "IPv4") {
          // If this is a wireless interface, prioritize it
          if (isWireless) {
            wifiIP = iface.address;
            ipAddresses.unshift(iface.address); // Add to beginning of array
          } else {
            ipAddresses.push(iface.address);
          }
        }
      }
    }

    // If we found a WiFi IP, make sure it's first in the array
    if (wifiIP && !ipAddresses.includes(wifiIP)) {
      ipAddresses.unshift(wifiIP);
    }

    // Filter for private IP addresses only (RFC 1918)
    const privateIPs = ipAddresses.filter((ip) => {
      if (ip === "127.0.0.1") return true;
      const parts = ip.split(".").map(Number);
      // 10.x.x.x
      if (parts[0] === 10) return true;
      // 172.16.x.x - 172.31.x.x
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      // 192.168.x.x
      if (parts[0] === 192 && parts[1] === 168) return true;
      return false;
    });

    // If we found a WiFi IP and it's private, make sure it's first in the array
    if (wifiIP && privateIPs.includes(wifiIP)) {
      const wifiIndex = privateIPs.indexOf(wifiIP);
      if (wifiIndex > 0) {
        privateIPs.splice(wifiIndex, 1);
        privateIPs.unshift(wifiIP);
      }
    }

    // Add localhost as fallback if not already present
    if (!privateIPs.includes("127.0.0.1")) {
      privateIPs.push("127.0.0.1");
    }

    return { success: true, interfaces: privateIPs };
  } catch (error) {
    console.error("Error getting network interfaces:", error);
    // Fallback to localhost if detection fails
    return {
      success: true,
      interfaces: ["127.0.0.1"],
    };
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

    // Show backup information before starting
    if (mainWindow) {
      mainWindow.webContents.send(
        "backup-output",
        "Creating database backup..."
      );
      mainWindow.webContents.send(
        "backup-output",
        "This backup includes all your cafe data: orders, inventory, staff, and settings."
      );
      mainWindow.webContents.send("backup-output", "Backup file: " + filePath);
      mainWindow.webContents.send(
        "backup-output",
        "Estimated time: 10-30 seconds depending on data size..."
      );
    }

    // Run our backup script with error handling
    try {
      const npmAvailable = commandExists("npm");
      if (!npmAvailable) {
        const errorMessage = "npm not found in PATH. Cannot create backup.";
        console.error(errorMessage);
        if (mainWindow) {
          mainWindow.webContents.send("backup-error", errorMessage);
        }
        return { success: false, message: errorMessage };
      }

      const backupProcess = safeSpawn("npm", ["run", "db:backup", filePath], {
        cwd: __dirname,
      });

      let output = "";
      let errorOutput = "";

      backupProcess.stdout.on("data", (data) => {
        output += data.toString();
        if (mainWindow) {
          mainWindow.webContents.send("backup-output", data.toString());
        }
      });

      backupProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
        if (mainWindow) {
          mainWindow.webContents.send("backup-error", data.toString());
        }
      });

      return new Promise((resolve) => {
        backupProcess.on("close", (code) => {
          if (code === 0) {
            if (mainWindow) {
              mainWindow.webContents.send(
                "backup-output",
                "✅ Backup completed successfully!"
              );
              mainWindow.webContents.send(
                "backup-output",
                "📁 Backup saved to: " + filePath
              );
              mainWindow.webContents.send(
                "backup-output",
                "🔒 Remember to store this file in a secure location."
              );
              mainWindow.webContents.send(
                "backup-output",
                "📚 For backup best practices, see the Backup section in README.md"
              );
            }
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
    } catch (backupError) {
      console.error("Failed to start backup process:", backupError);
      return {
        success: false,
        message: `Backup failed: ${backupError.message}`,
      };
    }
  } catch (error) {
    console.error("Error creating backup:", error);
    return { success: false, message: `Backup failed: ${error.message}` };
  }
});
