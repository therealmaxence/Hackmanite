const { app } = require('electron');

const { killSubprocesses } = require('./lib/process-manager');
const { bootServices } = require('./lib/boot-services');
const {
  createSplashWindow,
  createMainWindow,
  getMainWindow,
  getSplashWindow,
  updateStatus
} = require('./lib/window-manager');
const { registerIpcHandlers } = require('./lib/ipc-handlers');
const { createTray } = require('./lib/tray');

const isPackaged = app.isPackaged;

function handleRestart() {
  killSubprocesses();
  const mainWindow = getMainWindow();
  if (mainWindow) mainWindow.close();
  createSplashWindow();
  bootServices(updateStatus, () => {
    createMainWindow();
    const splashWin = getSplashWindow();
    if (splashWin) splashWin.close();
  });
}

function handleStop() {
  killSubprocesses();
  const mainWindow = getMainWindow();
  if (mainWindow) mainWindow.close();
}

app.on('ready', () => {
  createSplashWindow();
  createTray(isPackaged, createMainWindow, getMainWindow, handleRestart, handleStop);
  
  // Register IPC handlers exactly once using the dynamic getter
  registerIpcHandlers(getMainWindow);

  bootServices(updateStatus, () => {
    createMainWindow();
    const splashWin = getSplashWindow();
    if (splashWin) splashWin.close();
  });
});

app.on('window-all-closed', () => {
  killSubprocesses();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  killSubprocesses();
});
