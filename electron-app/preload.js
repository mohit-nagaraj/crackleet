const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // IPC communication
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
  analyzeWithLLM: (apiKey, model, imagePath, prompt) => 
    ipcRenderer.invoke('analyze-with-llm', apiKey, model, imagePath, prompt),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  
  // Event listeners
  onVisibilityChange: (callback) => 
    ipcRenderer.on('visibility-changed', (_, visible) => callback(visible)),
  onScreenshotCaptured: (callback) => 
    ipcRenderer.on('screenshot-captured', (_, path) => callback(path)),
  onSettingsLoaded: (callback) =>
    ipcRenderer.on('settings-loaded', (_, settings) => callback(settings)),
    
  // Helper methods
  readImageAsDataURL: (path) => {
    return new Promise((resolve, reject) => {
      try {
        const data = fs.readFileSync(path);
        const base64 = data.toString('base64');
        resolve(`data:image/png;base64,${base64}`);
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // LocalStorage helpers for persistent settings
  getStoredSetting: (key, defaultValue) => {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (error) {
      console.error(`Error getting stored setting ${key}:`, error);
      return defaultValue;
    }
  },
  
  setStoredSetting: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error setting stored setting ${key}:`, error);
      return false;
    }
  },
  
  removeStoredSetting: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing stored setting ${key}:`, error);
      return false;
    }
  }
});