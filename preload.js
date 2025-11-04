const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getWindows: () => ipcRenderer.invoke('get-windows'),
  startBot: (config) => ipcRenderer.invoke('start-bot', config),
  stopBot: () => ipcRenderer.invoke('stop-bot'),
  onBotError: (callback) => ipcRenderer.on('bot-error', (event, error) => callback(error))
});
