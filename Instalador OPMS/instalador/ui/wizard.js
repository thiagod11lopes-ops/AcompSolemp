const startUrlEl = document.getElementById('startUrl')
const desktopShortcutEl = document.getElementById('desktopShortcut')
const installDirEl = document.getElementById('installDir')
const btnInstall = document.getElementById('btnInstall')
const btnPickConnection = document.getElementById('btnPickConnection')
const connectionLabel = document.getElementById('connectionLabel')
let connectionJsonPath = null
const progressEl = document.getElementById('progress')
const barFill = document.getElementById('barFill')
const progressMsg = document.getElementById('progressMsg')
const errorEl = document.getElementById('error')
const successEl = document.getElementById('success')

function showError(msg) {
  errorEl.textContent = msg
  errorEl.classList.remove('hidden')
  successEl.classList.add('hidden')
}

function showSuccess(msg) {
  successEl.textContent = msg
  successEl.classList.remove('hidden')
  errorEl.classList.add('hidden')
}

async function init() {
  const info = await window.installer.getDefaults()
  installDirEl.textContent = `Pasta: ${info.installDir}`
  if (info.suggestedStartUrl) startUrlEl.value = info.suggestedStartUrl
}

btnPickConnection.addEventListener('click', async () => {
  const path = await window.installer.pickConnectionJson()
  if (path) {
    connectionJsonPath = path
    connectionLabel.textContent = path
  }
})

btnInstall.addEventListener('click', async () => {
  errorEl.classList.add('hidden')
  successEl.classList.add('hidden')
  btnInstall.disabled = true
  progressEl.classList.remove('hidden')

  try {
    const result = await window.installer.run({
      startUrl: startUrlEl.value,
      desktopShortcut: desktopShortcutEl.checked,
      connectionJsonPath,
    })
    showSuccess(`Instalação concluída.\n${result.installDir}`)
  } catch (e) {
    showError(e?.message || String(e))
    progressEl.classList.add('hidden')
  } finally {
    btnInstall.disabled = false
  }
})

window.installer.onProgress(({ percent, message }) => {
  barFill.style.width = `${percent}%`
  progressMsg.textContent = message
})

init()
