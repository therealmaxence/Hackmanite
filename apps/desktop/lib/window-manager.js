const { BrowserWindow, screen, app } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let splashWindow = null;

const CONFIG_PATH = path.join(app.getPath('userData'), 'window-state.json');
const log = (msg, err) => console.log(`[Electron Main][WindowManager] ${msg}`, err ? { error: err.message } : {});

const updateStatus = (status, percent) => {
  log(`Status: ${status} (${percent}%)`);
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('status-update', { status, percent });
  }
};

const icoPath = path.join(__dirname, '../hackmanite_main_icon.ico');

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480, height: 480, transparent: true, frame: false, alwaysOnTop: true, resizable: false, icon: icoPath,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  splashWindow.loadFile(path.join(__dirname, '../splash.html'));
  splashWindow.on('closed', () => splashWindow = null);
}

function loadWindowState() {
  const defaults = { width: 1200, height: 800 };
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const state = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (state && typeof state.x === 'number' && typeof state.y === 'number') {
        state.width = Math.max(state.width || defaults.width, 400);
        state.height = Math.max(state.height || defaults.height, 300);
        const isVisible = screen.getAllDisplays().some(d => {
          const { x, y, width, height } = d.bounds;
          return state.x >= x - 50 && state.y >= y - 50 && state.x < x + width - 100 && state.y < y + height - 100;
        });
        return isVisible ? state : { ...state, x: undefined, y: undefined };
      }
    }
  } catch (e) {
    log("Failed to load window state", e);
  }
  return defaults;
}

function saveWindowState() {
  if (!mainWindow) return;
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(mainWindow.getBounds())); } catch (e) { log("Failed to save window state", e); }
}

function createMainWindow() {
  const winState = loadWindowState();
  mainWindow = new BrowserWindow({
    width: winState.width, height: winState.height, x: winState.x, y: winState.y,
    frame: false, backgroundColor: '#10002b', icon: icoPath,
    webPreferences: { preload: path.join(__dirname, '../preload.js'), nodeIntegration: false, contextIsolation: true }
  });
  mainWindow.loadURL('http://localhost:3000');
  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => mainWindow = null);
  return mainWindow;
}

module.exports = {
  getMainWindow: () => mainWindow,
  getSplashWindow: () => splashWindow,
  updateStatus,
  createSplashWindow,
  loadWindowState,
  saveWindowState,
  createMainWindow
};
