// Preload mínimo — UI é 100% a aplicação web na URL configurada.
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('acomopmsDesktop', {
  version: '1.0.0',
})
