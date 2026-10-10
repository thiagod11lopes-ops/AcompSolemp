import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { defaultInstallDir } from './src/paths.mjs'
import { runInstaller } from './src/installer-run.mjs'
import { normalizeStartUrl } from '../cliente/lib/normalize-start-url.mjs'
import { resolveStartUrlFromServer } from '../cliente/lib/fetch-server-connection.mjs'
import { originFromStartUrl } from '../cliente/lib/normalize-start-url.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 520,
    height: 520,
    resizable: false,
    title: 'Instalar AcompOPMS',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  win.loadFile(join(__dirname, 'ui', 'index.html'))
}

ipcMain.handle('installer:getDefaults', async () => ({
  installDir: defaultInstallDir(),
  suggestedStartUrl: '',
}))

ipcMain.handle('installer:run', async (_evt, opts) => {
  let startUrl = opts?.startUrl
  if (!startUrl?.trim()) throw new Error('Informe o endereço do servidor.')
  const normalized = normalizeStartUrl(startUrl)
  const discovered = await resolveStartUrlFromServer(originFromStartUrl(normalized), normalized)
  startUrl = discovered.startUrl

  return runInstaller({
    startUrl,
    desktopShortcut: opts?.desktopShortcut,
    onProgress: (p) => {
      win?.webContents.send('installer:progress', p)
    },
  })
})

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
