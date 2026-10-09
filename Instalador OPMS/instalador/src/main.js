const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const { copyPayload } = require('./install-engine')

let win

function defaultInstallPath() {
  if (process.platform === 'win32') {
    // Evita EPERM: Program Files exige elevacao. Pasta gravavel sem admin.
    const base = process.env.LOCALAPPDATA || app.getPath('appData')
    return path.join(base, 'AcompOPMS')
  }
  return path.join(app.getPath('home'), '.local', 'share', 'acomopms')
}

function createWindow() {
  win = new BrowserWindow({
    width: 580,
    height: 640,
    resizable: false,
    maximizable: false,
    title: 'Instalar AcompOPMS',
    backgroundColor: '#070b10',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, '../ui/index.html'))
}

app.whenReady().then(() => {
  createWindow()
})

ipcMain.handle('installer:default-path', () => defaultInstallPath())

ipcMain.handle('installer:pick-path', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: defaultInstallPath(),
  })
  if (r.canceled || !r.filePaths[0]) return null
  return r.filePaths[0]
})

ipcMain.handle('installer:run', async (_e, { startUrl, installPath }) => {
  const send = (data) => win?.webContents.send('installer:progress', data)
  send({ percent: 0, message: 'Iniciando…' })
  return copyPayload({
    resourcesPath: process.resourcesPath,
    installPath,
    startUrl,
    onProgress: send,
  })
})

ipcMain.handle('installer:launch', (_e, binary) => {
  if (!binary || !fs.existsSync(binary)) return false
  spawn(binary, [], { detached: true, stdio: 'ignore' }).unref()
  return true
})

ipcMain.handle('installer:close', () => app.quit())
