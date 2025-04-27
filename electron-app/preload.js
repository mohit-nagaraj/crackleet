const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');

// Expose a limited API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  onVisibilityChange: (callback) => {
    ipcRenderer.on('visibility-changed', (event, visible) => {
      callback(visible);
    });
  },
  
  onScreenshotCaptured: (callback) => {
    ipcRenderer.on('screenshot-captured', (event, imagePath) => {
      callback(imagePath);
    });
  },
  
  captureScreenshot: () => {
    return ipcRenderer.invoke('capture-screenshot');
  },
  
  analyzeWithLLM: (apiKey, model, imagePath, prompt) => {
    return ipcRenderer.invoke('analyze-with-llm', apiKey, model, imagePath, prompt);
  },
  
  saveSettings: (settings) => {
    return ipcRenderer.invoke('save-settings', settings);
  },
  
  loadSettings: () => {
    return ipcRenderer.invoke('load-settings');
  },
  
  readImageAsDataURL: (imagePath) => {
    return new Promise((resolve, reject) => {
      fs.readFile(imagePath, (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        
        const base64 = data.toString('base64');
        resolve(`data:image/png;base64,${base64}`);
      });
    });
  }
});