const { BrowserWindow, screen, app } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let splashWindow = null;

const CONFIG_PATH = path.join(app.getPath('userData'), 'window-state.json');

const log = (msg, meta = {}) => {
  console.log(`[Electron Main][WindowManager] ${msg}`, meta);
};

function getMainWindow() {
  return mainWindow;
}

function getSplashWindow() {
  return splashWindow;
}

function updateStatus(status, percent) {
  log(`Status: ${status} (${percent}%)`);
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('status-update', { status, percent });
  }
}

function createSplashWindow() {
  const iconPath = path.join(__dirname, '../hackmanite_main_icon.ico');
  splashWindow = new BrowserWindow({
    width: 480,
    height: 480,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  splashWindow.loadFile(path.join(__dirname, '../splash.html'));
  
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function loadWindowState() {
  const defaults = { width: 1200, height: 800, x: undefined, y: undefined };
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const state = JSON.parse(data);

      if (state && typeof state.x === 'number' && typeof state.y === 'number') {
        state.width = Math.max(state.width || defaults.width, 400);
        state.height = Math.max(state.height || defaults.height, 300);

        const displays = screen.getAllDisplays();
        const isVisible = displays.some(display => {
          const { x, y, width, height } = display.bounds;
          return (
            state.x >= x - 50 &&
            state.y >= y - 50 &&
            state.x < x + width - 100 &&
            state.y < y + height - 100
          );
        });

        if (isVisible) {
          return state;
        } else {
          log("Saved window position is off-screen, resetting coordinates to center.");
          return { width: state.width, height: state.height, x: undefined, y: undefined };
        }
      }
      return state;
    }
  } catch (e) {
    log("Failed to load window state", { error: e.message });
  }
  return defaults;
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const bounds = mainWindow.getBounds();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(bounds, null, 2), 'utf8');
  } catch (e) {
    log("Failed to save window state", { error: e.message });
  }
}

function createMainWindow() {
  const windowState = loadWindowState();
  const iconPath = path.join(__dirname, '../hackmanite_main_icon.ico');

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    frame: false,
    backgroundColor: '#10002b',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('close', () => {
    saveWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

module.exports = {
  getMainWindow,
  getSplashWindow,
  updateStatus,
  createSplashWindow,
  loadWindowState,
  saveWindowState,
  createMainWindow
};
