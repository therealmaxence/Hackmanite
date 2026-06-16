const { Tray, Menu, app } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;

function createTray(isPackaged, createMainWindow, getMainWindow, onRestart, onStop) {
  const icoPath = path.join(__dirname, '../hackmanite_main_icon.ico');
  const pngPackagedPath = path.join(__dirname, '../hackmanite_main_nobg.png');
  const pngDevPath = path.resolve(__dirname, '../../web/public/dagex_app.png');

  let iconPath;
  if (!isPackaged && fs.existsSync(pngDevPath)) {
    iconPath = pngDevPath;
  } else if (process.platform === 'win32') {
    iconPath = icoPath;
  } else {
    iconPath = pngPackagedPath;
  }

  tray = new Tray(iconPath);
  tray.setToolTip('Hackmanite');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Client Window',
      click: () => {
        const mainWindow = getMainWindow();
        if (!mainWindow) createMainWindow();
        else mainWindow.show();
      }
    },
    { type: 'separator' },
    {
      label: 'Restart local servers',
      click: () => {
        onRestart();
      }
    },
    {
      label: 'Stop local servers',
      click: () => {
        onStop();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Application',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  return tray;
}

module.exports = { createTray };
