import { app, BrowserWindow, shell, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadDesktopConfig } from './lib/load-config.mjs'
import { resolveStartUrlFromServer } from './lib/fetch-server-connection.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
let mainWindow = null

async function resolveLaunchUrl() {
  const cfg = loadDesktopConfig({ cwd: __dirname })
  if (!cfg.discoverConnection) {
    return { startUrl: cfg.startUrl, cfg, discovery: null }
  }
  const discovery = await resolveStartUrlFromServer(cfg.origin, cfg.startUrl)
  return { startUrl: discovery.startUrl, cfg, discovery }
}

function createWindow(startUrl, title) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: title || 'AcompOPMS',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const target = new URL(url)
      const home = new URL(startUrl)
      if (target.origin !== home.origin) {
        event.preventDefault()
        shell.openExternal(url)
      }
    } catch {
      event.preventDefault()
    }
  })

  mainWindow.loadURL(startUrl)
  return mainWindow
}

app.whenReady().then(async () => {
  try {
    const { startUrl, cfg, discovery } = await resolveLaunchUrl()
    if (discovery?.source === 'server-connection.json') {
      console.log('[acompopms-cliente] URL do servidor:', startUrl)
    } else if (discovery?.detail) {
      console.warn('[acompopms-cliente] server-connection.json:', discovery.detail)
    }
    console.log('[acompopms-cliente] config:', cfg.source)
    createWindow(startUrl, cfg.windowTitle)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    dialog.showErrorBox('AcompOPMS — configuração', msg)
    app.exit(1)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      resolveLaunchUrl()
        .then(({ startUrl, cfg }) => createWindow(startUrl, cfg.windowTitle))
        .catch(() => app.exit(1))
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
