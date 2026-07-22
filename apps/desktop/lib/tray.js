const { Tray, Menu, app } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;

function createTray(isPackaged, createMainWindow, getMainWindow, onRestart, onStop) {
  const icoPath = path.join(__dirname, '../hackmanite_main_icon.ico');
  const pngPackagedPath = path.join(__dirname, '../hackmanite_main_nobg.png');
  const pngDevPath = path.resolve(__dirname, '../../web/public/dagex_app.png');

  const iconPath = (!isPackaged && fs.existsSync(pngDevPath))
    ? pngDevPath
    : (process.platform === 'win32' ? icoPath : pngPackagedPath);

  tray = new Tray(iconPath);
  tray.setToolTip('Hackmanite');

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Open Client Window',
      click: () => {
        const win = getMainWindow();
        win ? win.show() : createMainWindow();
      }
    },
    { type: 'separator' },
    { label: 'Restart local servers', click: onRestart },
    { label: 'Stop local servers', click: onStop },
    { type: 'separator' },
    { label: 'Quit Application', click: () => app.quit() }
  ]));
  return tray;
}

module.exports = { createTray };
