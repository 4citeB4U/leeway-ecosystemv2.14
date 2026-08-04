const { app, BrowserWindow, Menu, Tray, Notification, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow;
let tray;

function checkPort(port, callback) {
  const server = http.createServer();
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      callback(true); // Port in use
    } else {
      callback(false);
    }
  });
  server.once('listening', () => {
    server.close();
    callback(false); // Port free
  });
  server.listen(port, '127.0.0.1');
}

function startStaticServer(port, dir) {
  const express = require('express');
  const serverApp = express();
  serverApp.use(express.static(dir));
  serverApp.get('*', (req, res) => {
    res.sendFile(path.join(dir, 'index.html'));
  });
  serverApp.listen(port, '127.0.0.1', () => {
    console.log(`Local static server running on http://127.0.0.1:${port}`);
  });
}

function createWindow() {
  // Grant media permissions automatically for local camera/microphone
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (permission === 'media') {
      return true;
    }
    return false;
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Cerebral - Agent Lee",
    webPreferences: {
      nodeIntegration: false,
      contextBridge: true,
      sandbox: true
    }
  });

  const checkAndLoad = () => {
    checkPort(5173, (isRunning) => {
      if (isRunning) {
        mainWindow.loadURL('http://127.0.0.1:5173');
      } else {
        const distPath = path.join(__dirname, 'dist');
        if (fs.existsSync(distPath)) {
          startStaticServer(5174, distPath);
          mainWindow.loadURL('http://127.0.0.1:5174');
        } else {
          mainWindow.loadURL('data:text/html,<h1>Vite Dev Server (5173) and dist/ folder are missing. Run npm run dev or npm run build first!</h1>');
        }
      }
    });
  };

  checkAndLoad();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Try parent cerebral_ui.png or local fallback
  const iconPath = path.resolve(__dirname, '..', 'cerebral_ui.png');
  const trayIcon = fs.existsSync(iconPath) ? iconPath : null;

  if (!trayIcon) {
    console.warn("Tray icon not found at", iconPath);
    return;
  }

  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Cerebral', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
    { label: 'Hide Cerebral', click: () => { if (mainWindow) mainWindow.hide(); } },
    { type: 'separator' },
    { label: 'Exit', click: () => { app.isQuiting = true; app.quit(); } }
  ]);

  tray.setToolTip('Cerebral - Agent Lee');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) mainWindow.hide();
      else mainWindow.show();
    } else {
      createWindow();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  if (Notification.isSupported()) {
    new Notification({
      title: "Agent Lee",
      body: "Cerebral local desktop host initialized. Agent Lee Prime is online."
    }).show();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
