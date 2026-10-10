import { spawnSync } from 'node:child_process'

/** Encerra processos que seguram a pasta de instalação (Windows). */
export function tryReleaseWindowsLocks() {
  if (process.platform !== 'win32') return
  spawnSync('taskkill', ['/IM', 'AcompOPMS.exe', '/F', '/T'], {
    stdio: 'ignore',
    windowsHide: true,
  })
}
