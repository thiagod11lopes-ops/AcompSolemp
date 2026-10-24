const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('installer', {
  getDefaultInstallPath: () => ipcRenderer.invoke('installer:default-path'),
  getMeta: () => ipcRenderer.invoke('installer:meta'),
  pickInstallPath: () => ipcRenderer.invoke('installer:pick-path'),
  runInstall: (opts) => ipcRenderer.invoke('installer:run', opts),
  launchApp: (binary) => ipcRenderer.invoke('installer:launch', binary),
  closeApp: () => ipcRenderer.invoke('installer:close'),
  onProgress: (cb) => {
    ipcRenderer.on('installer:progress', (_e, data) => cb(data))
  },
})
