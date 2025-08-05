const { app, BrowserWindow, globalShortcut, ipcMain, dialog, screen, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
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

// Add this function to launch the injector
function launchInjector() {
  // Determine the path to the injector
  let injectorPath;

  // Development mode - use local path
  injectorPath = path.join(__dirname, 'injector', 'injector.exe');


  console.log('Launching injector from:', injectorPath);

  // Check if file exists
  if (!fs.existsSync(injectorPath)) {
    console.error('Injector executable not found at:', injectorPath);
    return;
  }

  // Launch the injector
  const injector = spawn(injectorPath);

  injector.stdout.on('data', (data) => {
    console.log(`Injector output: ${data}`);
  });

  injector.stderr.on('data', (data) => {
    console.error(`Injector error: ${data}`);
  });

  injector.on('close', (code) => {
    console.log(`Injector process exited with code ${code}`);
  });
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
      model: 'gemini-2.0-flash',
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
      contextIsolation: true,
      devTools: true // Enable dev tools for debugging
    },
    hasShadow: false
  });

  win.setIgnoreMouseEvents(true, { forward: true });


  
  ipcMain.on('tab-changed', (event, tabId) => {
    if (win) {
      if (tabId === 'settingsScreen') {
        win.setIgnoreMouseEvents(false);
      } else {
        win.setIgnoreMouseEvents(true, { forward: true });
      }
    }
  });

  win.setContentProtection(true);
  win.loadFile('index.html');

  win.once('ready-to-show', async () => {
    // Load settings before showing the window
    await loadAppSettings();

    // Send the loaded settings to the renderer
    win.webContents.send('app-settings-loaded', settings);

    win.show();

    // setTimeout(() => {
    //   launchInjector();
    // }, 2000);
  });

  // Open DevTools for debugging
  // win.webContents.openDevTools();
}

// Trigger analyze function in renderer
function triggerAnalyze() {
  console.log('Main process: triggering analyze');
  if (win && win.webContents) {
    win.webContents.send('trigger-analyze');
  }
}

// Trigger discard function in renderer
function triggerDiscard() {
  console.log('Main process: triggering discard');
  if (win && win.webContents) {
    win.webContents.send('trigger-discard');
  }
}

// Trigger cycle tab function in renderer
function triggerCycleTab() {
  console.log('Main process: triggering cycle tab');
  if (win && win.webContents) {
    win.webContents.send('trigger-cycle-tab');
  }
}

function registerHotkeys() {
  // Unregister any existing shortcuts to prevent duplicates
  globalShortcut.unregisterAll();

  globalShortcut.register('CommandOrControl+Alt+H', () => {
    console.log('Toggle visibility hotkey triggered');
    toggleOverlayVisibility();
  });

  globalShortcut.register('CommandOrControl+Alt+S', async () => {
    console.log('Capture screenshot hotkey triggered');
    const screenshotPath = await captureScreenshot();
    if (screenshotPath) {
      // Load settings (apiKey, model, language)
      if (!settings) {
        await loadAppSettings();
      }
      const apiKey = settings?.apiKey || 'API_KEY';
      const model = settings?.model || 'gemini-2.5-flash-preview-04-17';
      const language = settings?.language || 'javascript';
      if (apiKey && model) {
        try {
          const prompt = `Preferred language: ${language}`;
          const geminiAPI = new GeminiAPI(apiKey);
          const analysisResult = await geminiAPI.analyzeImage(model, screenshotPath, prompt);
          // Send result to renderer
          win.webContents.send('screenshot-analyzed', analysisResult);
        } catch (err) {
          console.error('Gemini analysis failed:', err);
          win.webContents.send('screenshot-analyzed', { error: err.message });
        }
      } else {
        win.webContents.send('screenshot-analyzed', { error: 'Missing Gemini API key or model in settings.' });
      }
    }
  });

  globalShortcut.register('CommandOrControl+Alt+A', () => {
    console.log('Analyze hotkey triggered in main process');
    triggerAnalyze();
  });

  globalShortcut.register('CommandOrControl+Alt+D', () => {
    console.log('Discard hotkey triggered in main process');
    triggerDiscard();
  });

  globalShortcut.register('CommandOrControl+Alt+T', () => {
    console.log('Cycle tab hotkey triggered in main process');
    triggerCycleTab();
  });

  globalShortcut.register('CommandOrControl+Alt+Q', () => {
    app.quit();
  });

  // Log registered shortcuts
  console.log('Hotkeys registered:', globalShortcut.isRegistered('CommandOrControl+Alt+A') ? 'success' : 'failed');
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