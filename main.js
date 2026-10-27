const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 360,
    minHeight: 600,
    title: "SintAklat-sanayan",
    icon: path.join(__dirname, 'desktop', 'app.ico'),
    autoHideMenuBar: true,
    backgroundColor: '#071942',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.maximize();
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
