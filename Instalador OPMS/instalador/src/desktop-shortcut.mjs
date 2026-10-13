import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { desktopDirectory } from './paths.mjs'

function psQuote(s) {
  return `'${String(s).replace(/'/g, "''")}'`
}

function createWindowsDesktopShortcut({ desktopDir, name, targetPath }) {
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
    { encoding: 'utf8', windowsHide: true },
  )
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || 'Falha ao criar atalho na área de trabalho')
  }
  return lnkPath
}

/**
 * @param {{ desktopShortcut: boolean, installDir: string, exeName: string }} opts
 */
export function createDesktopShortcutIfRequested(opts) {
  if (!opts.desktopShortcut) return null
  if (process.platform === 'win32') {
    return createWindowsDesktopShortcut({
      desktopDir: desktopDirectory(),
      name: 'AcompOPMS',
      targetPath: path.join(opts.installDir, opts.exeName),
    })
  }
  return null
}
