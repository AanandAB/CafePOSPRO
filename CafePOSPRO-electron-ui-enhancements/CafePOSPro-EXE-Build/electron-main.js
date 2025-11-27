const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;
let serverProcess;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    icon: path.join(__dirname, 'build/icon.ico')
  });

  // and load the index.html of the app.
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Load the local application
    mainWindow.loadFile(path.join(__dirname, 'cafepospro-app/dist/index.html'));
  }

  // Open links in external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
  
  // Start local server in production mode
  if (!isDev) {
    startLocalServer();
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Kill server process if it's running
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Start local server for production mode
function startLocalServer() {
  try {
    // Check if Node.js is available
    const nodePath = process.execPath.replace('electron.exe', 'node.exe');
    
    // Start the Vite development server
    serverProcess = spawn('npm', ['run', 'preview'], {
      cwd: path.join(__dirname, 'cafepospro-app'),
      stdio: 'pipe'
    });
    
    serverProcess.stdout.on('data', (data) => {
      console.log(`Server stdout: ${data}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(`Server stderr: ${data}`);
    });
    
    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
    });
    
    // Give the server time to start
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL('http://localhost:4173');
      }
    }, 3000);
  } catch (error) {
    console.error('Failed to start local server:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.executeJavaScript(`
        alert('Failed to start local server. Please ensure Node.js is installed and the application is properly configured.');
      `);
    }
  }
}

// IPC handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('check-nodejs', async () => {
  try {
    const { execSync } = require('child_process');
    const version = execSync('node --version', { encoding: 'utf8' });
    return { installed: true, version: version.trim() };
  } catch (error) {
    return { installed: false, version: null };
  }
});

ipcMain.handle('get-app-path', async () => {
  return app.getAppPath();
});

// Handle data persistence
ipcMain.handle('save-data', async (event, data, filename) => {
  try {
    const userDataPath = app.getPath('userData');
    const dataPath = path.join(userDataPath, 'cafepospro-data');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    
    const filePath = path.join(dataPath, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-data', async (event, filename) => {
  try {
    const userDataPath = app.getPath('userData');
    const dataPath = path.join(userDataPath, 'cafepospro-data');
    const filePath = path.join(dataPath, filename);
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return { success: true, data: JSON.parse(data) };
    }
    
    return { success: false, error: 'File not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});