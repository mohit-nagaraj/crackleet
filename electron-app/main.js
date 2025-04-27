const { app, BrowserWindow, globalShortcut, ipcMain, dialog, screen, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { writeFile, unlink } = require('fs').promises;
const GeminiAPI = require('./gemini-api');

let win;
let visible = true;
const tempDir = path.join(os.tmpdir(), 'leethelper-temp');
let settings = null;

// Ensure temp directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Clean up temp files on startup
function cleanupTempFiles() {
  if (fs.existsSync(tempDir)) {
    fs.readdirSync(tempDir).forEach(file => {
      const filePath = path.join(tempDir, file);
      fs.unlinkSync(filePath);
    });
  }
}

function toggleOverlayVisibility() {
  if (visible) {
    win.hide();
  } else {
    win.show();
  }
  visible = !visible;
  win.webContents.send('visibility-changed', visible);
}

async function captureScreenshot() {
  // Hide our window first so it doesn't appear in the screenshot
  const wasVisible = visible;
  if (wasVisible) win.hide();

  // Small delay to ensure the window is hidden
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    // Get all screen sources with high-resolution thumbnails
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'], 
      thumbnailSize: { 
        width: screen.getPrimaryDisplay().size.width,
        height: screen.getPrimaryDisplay().size.height
      }
    });

    // Find the primary display source
    const primaryDisplay = screen.getPrimaryDisplay();
    const source = sources.find(s => {
      // Different platforms may have different source display_id formats
      return s.display_id === primaryDisplay.id.toString() || 
             s.display_id === primaryDisplay.id || 
             (sources.length === 1); // Fallback if we can't match by ID
    });

    if (!source) {
      throw new Error('Primary display source not found');
    }

    // Decode the image as a Buffer
    const image = source.thumbnail.toPNG();

    // Generate a random filename
    const tempFilePath = path.join(tempDir, `screen-${uuidv4()}.png`);

    // Save the image
    await writeFile(tempFilePath, image);
    console.log('Screenshot saved to:', tempFilePath);

    // Show our window again if it was visible before
    if (wasVisible) {
      win.show();
      visible = true;
    }

    // Notify the renderer process
    win.webContents.send('screenshot-captured', tempFilePath);

    // Schedule file for deletion after 30 minutes
    setTimeout(() => {
      fs.access(tempFilePath, fs.constants.F_OK, (err) => {
        if (!err) {
          fs.unlink(tempFilePath, () => {});
        }
      });
    }, 30 * 60 * 1000); // 30 minutes

    return tempFilePath;

  } catch (error) {
    console.error('Screenshot capture failed:', error);
    console.error('Error details:', error.stack);

    // Show our window again if it was visible before
    if (wasVisible) {
      win.show();
      visible = true;
    }

    return null;
  }
}

// Load settings from disk
async function loadAppSettings() {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      settings = JSON.parse(data);
      return settings;
    }
    // Default settings if file doesn't exist
    settings = {
      apiKey: '',
      model: 'gemini-pro-vision',
      language: 'javascript',
      theme: 'vs-dark'
    };
    return settings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    // Default settings if there's an error
    settings = {
      apiKey: '',
      model: 'gemini-pro-vision',
      language: 'javascript',
      theme: 'vs-dark'
    };
    return settings;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1000, 
    height: 800,
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

  win.once('ready-to-show', async () => {
    // Load settings before showing the window
    await loadAppSettings();
    
    // Send the loaded settings to the renderer
    win.webContents.send('settings-loaded', settings);
    
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

  // Register Ctrl+Alt+S to capture screenshot
  const screenshotSuccess = globalShortcut.register('CommandOrControl+Alt+S', () => {
    console.log('Screenshot hotkey pressed');
    captureScreenshot();
  });

  // Register Ctrl+Alt+Q to quit the application
  const quitSuccess = globalShortcut.register('CommandOrControl+Alt+Q', () => {
    console.log('Quit hotkey pressed');
    app.quit();
  });

  if (!toggleSuccess || !quitSuccess || !screenshotSuccess) {
    console.error('Hotkey registration failed');
  } else {
    console.log('Hotkeys registered successfully');
  }
}

app.whenReady().then(async () => {
  cleanupTempFiles();
  createWindow();
  registerHotkeys();
});

app.on('will-quit', () => {
  // Unregister all shortcuts when app is about to quit
  globalShortcut.unregisterAll();
  
  // Clean up temp directory
  cleanupTempFiles();
});

// Handle IPC messages from renderer
ipcMain.handle('capture-screenshot', async () => {
  return await captureScreenshot();
});

ipcMain.handle('analyze-with-llm', async (event, apiKey, model, imagePath, prompt) => {
  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error('Screenshot file not found');
    }
    
    // Handle different model providers
    if (model.startsWith('gemini-')) {
      const geminiAPI = new GeminiAPI(apiKey);
      return await geminiAPI.analyzeImage(model, imagePath, prompt);
    } else if (model.startsWith('claude-')) {
      // Add Claude implementation here in the future
      throw new Error('Claude models are not yet implemented');
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  } catch (error) {
    console.error('LLM analysis failed:', error);
    throw error;
  }
});

ipcMain.handle('save-settings', async (event, newSettings) => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    await writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
    
    // Update our local settings
    settings = newSettings;
    
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
});

ipcMain.handle('load-settings', async () => {
  // Use the cached settings if available, otherwise load from disk
  if (settings) {
    return settings;
  }
  return await loadAppSettings();
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