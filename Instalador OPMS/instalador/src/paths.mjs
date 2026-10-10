import { homedir } from 'node:os'
import { join } from 'node:path'

export function defaultInstallDir() {
  if (process.platform === 'win32') {
    const base = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
    return join(base, 'AcompOPMS')
  }
  return join(homedir(), '.local', 'share', 'AcompOPMS')
}

export function desktopDirectory() {
  if (process.platform === 'win32') {
    const base = process.env.USERPROFILE || homedir()
    return join(base, 'Desktop')
  }
  return join(homedir(), 'Desktop')
}

export function clientExeName() {
  return process.platform === 'win32' ? 'AcompOPMS.exe' : 'AcompOPMS'
}
