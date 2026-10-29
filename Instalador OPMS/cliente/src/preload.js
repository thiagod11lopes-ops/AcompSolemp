const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('acomopmsDesktop', { version: '1.0.0' })
