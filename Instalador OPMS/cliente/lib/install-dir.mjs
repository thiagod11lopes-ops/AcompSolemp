import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const CONFIG_FILENAME = 'acomopms-desktop.config.json'

export function defaultInstallDir() {
  if (process.platform === 'win32') {
    const base = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
    return join(base, 'AcompOPMS')
  }
  return join(homedir(), '.local', 'share', 'AcompOPMS')
}

/** @param {string} cwd pasta do executável / app */
export function resolveInstallDirFromConfig(cwd) {
  if (existsSync(join(cwd, CONFIG_FILENAME))) return cwd
  const def = defaultInstallDir()
  if (existsSync(join(def, CONFIG_FILENAME))) return def
  return def
}
