const { app, BrowserWindow, globalShortcut, ipcMain, dialog, screen, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { writeFile, unlink, readFile } = require('fs').promises;
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
  const files = fs.readdirSync(tempDir);
  for (const file of files) {
    const filePath = path.join(tempDir, file);
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted temporary file: ${filePath}`);
    } catch (err) {
      console.error(`Failed to delete temporary file ${filePath}:`, err);
    }
  }
}

function toggleOverlayVisibility() {
  visible = !visible;
  if (win) {
    if (visible) {
      win.show();
    } else {
      win.hide();
    }
  }
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
          fs.unlink(tempFilePath, () => { });
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
      model: 'gemini-1.5-pro',
      language: 'javascript',
      theme: 'vs-dark'
    };
    return settings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    // Default settings if there's an error
    settings = {
      apiKey: '',
      model: 'gemini-1.5-pro',
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
    },
    hasShadow: false
  });

  // win.setIgnoreMouseEvents(true, { forward: true });

  // ipcMain.handle('toggle-mouse-events', (event, ignore) => {
  //   win.setIgnoreMouseEvents(ignore, { forward: true });
  // });

  win.setContentProtection(true);
  win.loadFile('index.html');

  win.once('ready-to-show', async () => {
    // Load settings before showing the window
    await loadAppSettings();

    // Send the loaded settings to the renderer
    win.webContents.send('app-settings-loaded', settings);

    win.show();
  });

  // Open the DevTools.
  // win.webContents.openDevTools();
}

function registerHotkeys() {
  globalShortcut.register('Ctrl+Alt+H', () => {
    toggleOverlayVisibility();
  });

  globalShortcut.register('Ctrl+Alt+S', () => {
    captureScreenshot();
  });

  globalShortcut.register('Ctrl+Alt+Q', () => {
    app.quit();
  });
}

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
    if (typeof newSettings !== 'object' || newSettings === null) {
      throw new Error('Invalid settings data');
    }

    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    console.log('Saving settings to:', settingsPath);
    console.log('Settings data:', newSettings);

    await writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
    settings = newSettings; // Update cached settings
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error.message);
    console.error('Error details:', error.stack);
    return false;
  }
});

ipcMain.handle('load-settings', async () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
    // Return default settings if the file doesn't exist
    return {
      apiKey: '',
      model: 'gemini-1.5-pro',
      language: 'javascript',
      theme: 'vs-dark'
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    // Return default settings if there's an error
    return {
      apiKey: '',
      model: 'gemini-1.5-pro',
      language: 'javascript',
      theme: 'vs-dark'
    };
  }
});

ipcMain.handle('read-image-as-data-url', async (event, imagePath) => {
  try {
    const imageBuffer = await readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataURL = `data:image/png;base64,${base64Image}`;
    return dataURL;
  } catch (error) {
    console.error('Failed to read image as data URL:', error);
    throw error;
  }
});

app.whenReady().then(async () => {
  cleanupTempFiles();
  console.log('User data path:', app.getPath('userData'));
  createWindow();
  registerHotkeys();

  const testPath = path.join(app.getPath('userData'), 'test.json');
  try {
    await writeFile(testPath, JSON.stringify({ test: 'data' }, null, 2));
    console.log('Test file written successfully:', testPath);
  } catch (error) {
    console.error('Failed to write test file:', error.message);
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts when app is about to quit
  globalShortcut.unregisterAll();

  // Clean up temp directory
  cleanupTempFiles();
});