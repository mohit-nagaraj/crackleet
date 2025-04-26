const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Prevent window content from being captured by screen recording or screenshots
  win.setContentProtection(true);

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
