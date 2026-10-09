const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const { copyPayload, resolveInstallPath } = require('./install-engine')
const { createDesktopShortcut } = require('./desktop-shortcut')

let win

function localAcompPathWin() {
  if (process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'AcompOPMS')
  }
  return path.join(app.getPath('home'), 'AppData', 'Local', 'AcompOPMS')
}

function defaultInstallPath() {
  if (process.platform === 'win32') {
    return localAcompPathWin()
  }
  return path.join(app.getPath('home'), '.local', 'share', 'acomopms')
}

/** Program Files exige admin; redireciona para AppData\\Local. */
function normalizeInstallPath(installPath) {
  let p
  try {
    p = resolveInstallPath(installPath)
  } catch {
    p = path.normalize(String(installPath || '').trim())
  }
  if (process.platform !== 'win32') return p
  const lower = p.toLowerCase()
  if (lower.includes('program files') || lower.includes('program files (x86)')) {
    return localAcompPathWin()
  }
  return p
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

ipcMain.handle('installer:meta', () => ({
  version: require('../package.json').version,
  defaultPath: defaultInstallPath(),
}))

ipcMain.handle('installer:pick-path', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: defaultInstallPath(),
  })
  if (r.canceled || !r.filePaths[0]) return null
  return r.filePaths[0]
})

ipcMain.handle('installer:run', async (_e, { startUrl, installPath, createDesktopShortcut: wantShortcut }) => {
  const send = (data) => win?.webContents.send('installer:progress', data)
  const resolvedPath = normalizeInstallPath(installPath)
  if (resolvedPath !== path.normalize(String(installPath || '').trim())) {
    send({ percent: 0, message: 'Pasta Program Files requer admin; usando AppData Local…' })
  }
  send({ percent: 0, message: 'Iniciando…' })
  try {
    const result = await copyPayload({
      resourcesPath: process.resourcesPath,
      installPath: resolvedPath,
      startUrl,
      onProgress: send,
    })
    if (wantShortcut && result.launchBinary) {
      send({ percent: 99, message: 'Criando atalho na Area de trabalho…' })
      try {
        result.desktopShortcutPath = createDesktopShortcut(app, result.launchBinary, 'AcompOPMS')
      } catch (shortcutErr) {
        result.desktopShortcutError =
          shortcutErr && shortcutErr.message ? shortcutErr.message : String(shortcutErr)
      }
    }
    return result
  } catch (err) {
    const msg = err && err.message ? err.message : String(err)
    throw new Error(msg)
  }
})

ipcMain.handle('installer:launch', (_e, binary) => {
  if (!binary || !fs.existsSync(binary)) return false
  spawn(binary, [], { detached: true, stdio: 'ignore' }).unref()
  return true
})

ipcMain.handle('installer:close', () => app.quit())
