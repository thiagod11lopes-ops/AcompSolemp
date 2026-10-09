const steps = ['step-welcome', 'step-url', 'step-path', 'step-progress', 'step-done']
let index = 0

function showStep(i) {
  index = i
  steps.forEach((id, j) => {
    document.getElementById(id).classList.toggle('active', j === i)
  })
}

document.querySelectorAll('[data-next]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (index === 1) {
      const url = document.getElementById('input-url').value.trim()
      if (!url) return alert('Informe a URL.')
      try {
        const u = new URL(url)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error()
      } catch {
        return alert('URL inválida.')
      }
    }
    showStep(Math.min(index + 1, steps.length - 1))
  })
})

document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', () => showStep(Math.max(index - 1, 0)))
})

window.addEventListener('DOMContentLoaded', async () => {
  const meta = await window.installer.getMeta()
  document.getElementById('input-path').value = meta.defaultPath
  document.getElementById('input-path').readOnly = true
  document.getElementById('input-url').value =
    'https://thiagod11lopes-ops.github.io/AcompSolemp/'
  const sub = document.querySelector('.sub')
  if (sub) sub.textContent = `Instalador v${meta.version} — destino: AppData\\Local\\AcompOPMS (sem admin)`
})

document.getElementById('btn-browse').addEventListener('click', async () => {
  const p = await window.installer.pickInstallPath()
  if (p) document.getElementById('input-path').value = p
})

document.getElementById('btn-install').addEventListener('click', async () => {
  const startUrl = document.getElementById('input-url').value.trim()
  const installPath = document.getElementById('input-path').value.trim()
  if (!installPath) return alert('Escolha a pasta de instalação.')

  showStep(3)
  const bar = document.getElementById('progress-bar')
  const pct = document.getElementById('progress-pct')
  const label = document.getElementById('progress-label')

  window.installer.onProgress(({ percent, message }) => {
    bar.style.width = `${percent}%`
    pct.textContent = `${percent}%`
    if (message) label.textContent = message
  })

  try {
    const createDesktopShortcut = document.getElementById('chk-desktop-shortcut').checked
    const result = await window.installer.runInstall({ startUrl, installPath, createDesktopShortcut })
    document.getElementById('done-path').textContent = result.installPath
    const shortcutLine = document.getElementById('done-shortcut')
    if (shortcutLine) {
      if (result.desktopShortcutPath) {
        shortcutLine.textContent = 'Atalho AcompOPMS criado na Área de trabalho.'
      } else if (createDesktopShortcut && result.desktopShortcutError) {
        shortcutLine.textContent = `Atalho nao criado: ${result.desktopShortcutError}`
      } else {
        shortcutLine.textContent = ''
      }
    }
    showStep(4)
    window.__lastLaunch = result.launchBinary
  } catch (e) {
    alert(e.message || String(e))
    showStep(2)
  }
})

document.getElementById('btn-launch').addEventListener('click', () => {
  if (window.__lastLaunch) window.installer.launchApp(window.__lastLaunch)
})

document.getElementById('btn-close').addEventListener('click', () => window.installer.closeApp())
