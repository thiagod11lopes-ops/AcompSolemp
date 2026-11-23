const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('installer', {
  getDefaults: () => ipcRenderer.invoke('installer:getDefaults'),
  pickConnectionJson: () => ipcRenderer.invoke('installer:pickConnectionJson'),
  run: (opts) => ipcRenderer.invoke('installer:run', opts),
  onProgress: (cb) => {
    ipcRenderer.on('installer:progress', (_e, data) => cb(data))
  },
})
