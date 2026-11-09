const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function createWindowsDesktopShortcut({ desktopDir, name, targetPath }) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    throw new Error('Executavel do AcompOPMS nao encontrado para o atalho.')
  }
  const lnkPath = path.join(desktopDir, `${name}.lnk`)
  const workDir = path.dirname(targetPath)
  const script = [
    '$ws = New-Object -ComObject WScript.Shell',
    `$sc = $ws.CreateShortcut(${psQuote(lnkPath)})`,
    `$sc.TargetPath = ${psQuote(targetPath)}`,
    `$sc.WorkingDirectory = ${psQuote(workDir)}`,
    `$sc.Description = ${psQuote('AcompOPMS')}`,
    '$sc.Save()',
  ].join('; ')

  const r = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { windowsHide: true, encoding: 'utf8' },
  )
  if (r.status !== 0) {
    const detail = (r.stderr || r.stdout || '').trim()
    throw new Error(detail || 'Nao foi possivel criar o atalho na Area de trabalho.')
  }
  return lnkPath
}

function createLinuxDesktopEntry({ desktopDir, name, targetPath }) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    throw new Error('Executavel do AcompOPMS nao encontrado para o atalho.')
  }
  const entryPath = path.join(desktopDir, `${name}.desktop`)
  const body = [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${name}`,
    `Exec=${targetPath}`,
    'Terminal=false',
    'Categories=Utility;',
    '',
  ].join('\n')
  fs.writeFileSync(entryPath, body, 'utf8')
  try {
    fs.chmodSync(entryPath, 0o755)
  } catch {
    /* ignore */
  }
  return entryPath
}

function createDesktopShortcut(app, targetPath, name = 'AcompOPMS') {
  const desktopDir = app.getPath('desktop')
  if (process.platform === 'win32') {
    return createWindowsDesktopShortcut({ desktopDir, name, targetPath })
  }
  if (process.platform === 'linux') {
    return createLinuxDesktopEntry({ desktopDir, name, targetPath })
  }
  throw new Error('Atalho na area de trabalho disponivel apenas em Windows e Linux.')
}

module.exports = { createDesktopShortcut }
