const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('acomopmsDesktop', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
})
