const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { keyboard, Key } = require('@nut-tree-fork/nut-js');
const { getOpenWindows, focusWindow } = require('./windows-helper');

keyboard.config.autoDelayMs = 20;

let mainWindow;
let botInterval = null;
let selectedWindowId = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#1a1a2e',
    resizable: false,
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-windows', async () => {
  try {
    return getOpenWindows();
  } catch (error) {
    return [];
  }
});

ipcMain.handle('start-bot', async (event, { windowId, message }) => {
  if (botInterval) {
    return { success: false, error: 'Bot zaten çalışıyor' };
  }

  try {
    selectedWindowId = windowId;
    
    const sendMessage = async () => {
      if (!selectedWindowId) {
        throw new Error('Pencere seçili değil');
      }
      await focusWindow(selectedWindowId);
      await new Promise(resolve => setTimeout(resolve, 300));
      await keyboard.pressKey(Key.LeftControl);
      await keyboard.pressKey(Key.A);
      await keyboard.releaseKey(Key.A);
      await keyboard.releaseKey(Key.LeftControl);
      await keyboard.pressKey(Key.Backspace);
      await keyboard.releaseKey(Key.Backspace);
      
      for (const char of message) {
        await keyboard.type(char);
      }
      
      await keyboard.pressKey(Key.Enter);
      await keyboard.releaseKey(Key.Enter);
    };

    await sendMessage();
    botInterval = setInterval(() => {
      sendMessage().catch(error => {
        mainWindow.webContents.send('bot-error', error.message);
      });
    }, 20000);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-bot', async () => {
  if (botInterval) {
    clearInterval(botInterval);
    botInterval = null;
    selectedWindowId = null;
    return { success: true };
  }
  return { success: false, error: 'Bot zaten durdurulmuş' };
});
