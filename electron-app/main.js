const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');

let win;
let visible = true;

function toggleOverlayVisibility() {
  if (visible) {
    win.hide();
  } else {
    win.show();
  }
  visible = !visible;
  win.webContents.send('visibility-changed', visible);
}

function createWindow() {
  win = new BrowserWindow({
    width: 800, 
    height: 600,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: "Secure Window 123",  // Must match exactly
    backgroundColor: '#00000010', // Mostly transparent
    webPreferences: { 
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.setContentProtection(true);
  win.loadFile('index.html');

  win.once('ready-to-show', () => {
    win.show();
    console.log('Window is now visible');
  });
}

function registerHotkeys() {
  // Register Ctrl+Alt+H to hide/show the overlay
  const toggleSuccess = globalShortcut.register('CommandOrControl+Alt+H', () => {
    console.log('Toggle visibility hotkey pressed');
    toggleOverlayVisibility();
  });

  // Register Ctrl+Alt+Q to quit the application
  const quitSuccess = globalShortcut.register('CommandOrControl+Alt+Q', () => {
    console.log('Quit hotkey pressed');
    app.quit();
  });

  if (!toggleSuccess || !quitSuccess) {
    console.error('Hotkey registration failed');
  } else {
    console.log('Hotkeys registered successfully');
  }
}

app.whenReady().then(() => {
  createWindow();
  registerHotkeys();
});

app.on('will-quit', () => {
  // Unregister all shortcuts when app is about to quit
  globalShortcut.unregisterAll();
});

// Prevent app from closing when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});