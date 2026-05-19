const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Data files stored next to the .exe (packaged) or project root (dev)
function getBaseDir() {
  return app.isPackaged ? path.dirname(process.execPath) : __dirname;
}

function readJsonFile(filename, fallback) {
  const filePath = path.join(getBaseDir(), filename);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Failed to read ${filename}:`, e);
  }
  return fallback;
}

function writeJsonFile(filename, data) {
  const filePath = path.join(getBaseDir(), filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error(`Failed to write ${filename}:`, e);
    return false;
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#FFF8F0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-unmaximized');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Window control IPC handlers
ipcMain.on('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow.close();
});

// Task data IPC handlers
ipcMain.handle('tasks-read', () => readJsonFile('tasks.json', []));
ipcMain.handle('tasks-write', (_, tasks) => writeJsonFile('tasks.json', tasks));

// Notes data IPC handlers
ipcMain.handle('notes-read', () => readJsonFile('notes.json', []));
ipcMain.handle('notes-write', (_, notes) => writeJsonFile('notes.json', notes));
