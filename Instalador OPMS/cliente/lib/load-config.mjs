import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeStartUrl, originFromStartUrl } from './normalize-start-url.mjs'

import { CONFIG_FILENAME, defaultInstallDir as sharedDefaultInstallDir } from './install-dir.mjs'

export { CONFIG_FILENAME }

function installConfigPath() {
  return join(sharedDefaultInstallDir(), CONFIG_FILENAME)
}

function readJsonConfig(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw)
  if (!data.startUrl || typeof data.startUrl !== 'string') {
    throw new Error(`${CONFIG_FILENAME}: campo startUrl obrigatório`)
  }
  return { ...data, _configPath: filePath }
}

/**
 * @param {{ cwd?: string, explicitPath?: string }} [opts]
 */
export function loadDesktopConfig(opts = {}) {
  const cwd = opts.cwd ?? process.cwd()

  if (process.env.ACOMOPMS_START_URL?.trim()) {
    const startUrl = normalizeStartUrl(process.env.ACOMOPMS_START_URL)
    return {
      startUrl,
      origin: originFromStartUrl(startUrl),
      discoverConnection: true,
      source: 'env:ACOMOPMS_START_URL',
    }
  }

  const candidates = [
    opts.explicitPath,
    join(cwd, CONFIG_FILENAME),
    installConfigPath(),
  ].filter(Boolean)

  for (const p of candidates) {
    if (!existsSync(p)) continue
    const data = readJsonConfig(p)
    const startUrl = normalizeStartUrl(data.startUrl)
    return {
      startUrl,
      origin: originFromStartUrl(startUrl),
      discoverConnection: data.discoverConnection !== false,
      windowTitle: data.windowTitle ?? 'AcompOPMS',
      source: p,
      raw: data,
    }
  }

  throw new Error(
    `Config não encontrada. Crie ${CONFIG_FILENAME} ou defina ACOMOPMS_START_URL.\n` +
      `Exemplo: Instalador OPMS/cliente/${CONFIG_FILENAME.replace('.json', '.example.json')}`,
  )
}

export { installConfigPath }
