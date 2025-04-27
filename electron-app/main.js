const { app, BrowserWindow, globalShortcut, ipcMain, dialog, screen, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { writeFile, unlink } = require('fs').promises;

let win;
let visible = true;
const tempDir = path.join(os.tmpdir(), 'leethelper-temp');

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
    // Use desktopCapturer to get a screenshot of the primary display
    const sources = await desktopCapturer.getSources({ types: ['screen'] });

    // Find the primary display source
    const primaryDisplay = screen.getPrimaryDisplay();
    const source = sources.find(source => source.display_id === primaryDisplay.id.toString());

    if (!source) {
      throw new Error('Primary display source not found');
    }

    // Decode the image as a Buffer
    const image = source.thumbnail.toPNG();

    // Generate a random filename
    const tempFilePath = path.join(tempDir, `screen-${uuidv4()}.png`);

    // Save the image
    await writeFile(tempFilePath, image);

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

    // Show our window again if it was visible before
    if (wasVisible) {
      win.show();
      visible = true;
    }

    return null;
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

app.whenReady().then(() => {
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
    // Implementation for LLM analysis will be here
    // For now, we'll return a mock response
    const mockResponse = {
      explanation: "This appears to be a solution to a binary search problem. The algorithm efficiently finds a target value in a sorted array by repeatedly dividing the search space in half.",
      code: "function binarySearch(nums, target) {\n  let left = 0;\n  let right = nums.length - 1;\n\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (nums[mid] === target) {\n      return mid;\n    } else if (nums[mid] < target) {\n      left = mid + 1;\n    } else {\n      right = mid - 1;\n    }\n  }\n\n  return -1;\n}",
      complexity: "Time Complexity: O(log n), Space Complexity: O(1)"
    };
    
    return mockResponse;
  } catch (error) {
    console.error('LLM analysis failed:', error);
    throw error;
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
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
    return {
      apiKey: '',
      model: 'gemini-pro-vision',
      language: 'javascript',
      theme: 'vs-dark'
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return {
      apiKey: '',
      model: 'gemini-pro-vision',
      language: 'javascript',
      theme: 'vs-dark'
    };
  }
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