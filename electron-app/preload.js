const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  toggleMouseEvents: (enable) => ipcRenderer.send('toggle-mouse-events', enable),
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
  onVisibilityChange: (callback) => {
    ipcRenderer.on('visibility-change', (_, visible) => callback(visible));
  },
  onScreenshotCaptured: (callback) => {
    ipcRenderer.on('screenshot-captured', (_, imagePath) => callback(imagePath));
  },
  readImageAsDataURL: (filePath) => ipcRenderer.invoke('read-image-as-data-url', filePath),
  analyzeWithLLM: (apiKey, model, imagePath, prompt) => 
    ipcRenderer.invoke('analyze-with-llm', apiKey, model, imagePath, prompt),
  onTriggerAnalyze: (callback) => {
    ipcRenderer.on('trigger-analyze', () => {
      console.log('Preload: Received trigger-analyze event');
      callback();
    });
  },
  onTriggerDiscard: (callback) => {
    ipcRenderer.on('trigger-discard', () => {
      console.log('Preload: Received trigger-discard event');
      callback();
    });
  },
  onTriggerCycleTab: (callback) => {
    ipcRenderer.on('trigger-cycle-tab', () => {
      console.log('Preload: Received trigger-cycle-tab event');
      callback();
    });
  }
});