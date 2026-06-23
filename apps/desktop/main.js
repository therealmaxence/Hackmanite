const { app } = require('electron');
const { killSubprocesses } = require('./lib/process-manager');
const { bootServices } = require('./lib/boot-services');
const { createSplashWindow, createMainWindow, getMainWindow, getSplashWindow, updateStatus } = require('./lib/window-manager');
const { registerIpcHandlers } = require('./lib/ipc-handlers');
const { createTray } = require('./lib/tray');

const boot = () => bootServices(updateStatus, () => {
  createMainWindow();
  getSplashWindow()?.close();
});

const handleRestart = () => {
  killSubprocesses();
  getMainWindow()?.close();
  createSplashWindow();
  boot();
};

const handleStop = () => {
  killSubprocesses();
  getMainWindow()?.close();
};

app.on('ready', () => {
  createSplashWindow();
  createTray(app.isPackaged, createMainWindow, getMainWindow, handleRestart, handleStop);
  registerIpcHandlers(getMainWindow);
  boot();
});

app.on('window-all-closed', () => {
  killSubprocesses();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', killSubprocesses);
