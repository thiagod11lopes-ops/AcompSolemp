const { app, BrowserWindow, Menu, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const CONFIG_FILE_NAME = 'acomopms-desktop.config.json'
const DEFAULT_TITLE = 'AcompOPMS'

function configCandidates() {
  const exeDir = path.dirname(process.execPath)
  return [
    path.join(exeDir, CONFIG_FILE_NAME),
    path.join(app.getPath('userData'), CONFIG_FILE_NAME),
  ]
}

function loadConfig() {
  if (process.env.ACOMOPMS_DESKTOP_URL) {
    return { startUrl: process.env.ACOMOPMS_DESKTOP_URL.trim(), productName: DEFAULT_TITLE }
  }
  for (const cfgPath of configCandidates()) {
    try {
      if (!fs.existsSync(cfgPath)) continue
      const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
      if (raw?.startUrl) {
        return {
          startUrl: String(raw.startUrl).trim(),
          productName: raw.productName ? String(raw.productName) : DEFAULT_TITLE,
        }
      }
    } catch {
      /* next */
    }
  }
  return null
}

function isAllowedStartUrl(urlString) {
  try {
    const u = new URL(urlString)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

function createWindow(startUrl, title) {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title,
    backgroundColor: '#0a0e14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.once('ready-to-show', () => win.show())
  Menu.setApplicationMenu(null)

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    try {
      const target = new URL(url)
      const origin = new URL(startUrl)
      if (target.origin !== origin.origin) {
        event.preventDefault()
        shell.openExternal(url)
      }
    } catch {
      event.preventDefault()
    }
  })

  win.loadURL(startUrl)
  return win
}

app.whenReady().then(() => {
  const cfg = loadConfig()
  if (!cfg || !isAllowedStartUrl(cfg.startUrl)) {
    dialog.showErrorBox(
      'AcompOPMS',
      `Configuração ausente. Execute novamente o instalador em "Instalador OPMS".`,
    )
    app.quit()
    return
  }

  createWindow(cfg.startUrl, cfg.productName || DEFAULT_TITLE)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(cfg.startUrl, cfg.productName || DEFAULT_TITLE)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
