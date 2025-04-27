const { contextBridge, ipcRenderer } = require('electron');

// Expose a limited API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  onVisibilityChange: (callback) => {
    ipcRenderer.on('visibility-changed', (event, visible) => {
      callback(visible);
    });
  }
});