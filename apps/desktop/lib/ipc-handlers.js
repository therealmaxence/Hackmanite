const { ipcMain, shell } = require('electron');

function registerIpcHandlers(getMainWindow) {
  const getWin = () => getMainWindow();
  ipcMain.on('window-minimize', () => getWin()?.minimize());
  ipcMain.on('window-maximize', () => {
    const win = getWin();
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.on('window-close', () => getWin()?.close());
  ipcMain.handle('window-is-maximized', () => getWin()?.isMaximized() ?? false);
  ipcMain.handle('shell-open-url', (_event, url) => shell.openExternal(url));
}

module.exports = { registerIpcHandlers };
