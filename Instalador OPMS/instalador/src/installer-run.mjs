import { writeFileSync, mkdirSync, renameSync, cpSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { normalizeStartUrl } from '../../cliente/lib/normalize-start-url.mjs'
import { CONFIG_FILENAME } from '../../cliente/lib/load-config.mjs'
import { defaultInstallDir, clientExeName } from './paths.mjs'
import { tryReleaseWindowsLocks } from './release-locks.mjs'
import { createDesktopShortcutIfRequested } from './desktop-shortcut.mjs'
import {
  copyPayloadToStaging,
  retireInstallDir,
  promoteStagingToInstall,
  cleanupDir,
} from './copy-payload.mjs'

const instaladorRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function payloadRoot() {
  return join(instaladorRoot, 'resources', 'payload')
}

function renameElectronBinary(stagingDir) {
  const exeName = clientExeName()
  if (process.platform === 'win32') {
    const from = join(stagingDir, 'electron.exe')
    const to = join(stagingDir, exeName)
    renameSync(from, to)
  } else {
    const from = join(stagingDir, 'electron')
    const to = join(stagingDir, exeName)
    cpSync(from, to, { mode: 0o755 })
  }
}

/**
 * @param {{
 *   startUrl: string,
 *   desktopShortcut?: boolean,
 *   installDir?: string,
 *   onProgress?: (p: { percent: number, message: string }) => void,
 * }} opts
 */
export async function runInstaller(opts) {
  const report = (percent, message) => opts.onProgress?.({ percent, message })
  const installDir = opts.installDir || defaultInstallDir()
  const startUrl = normalizeStartUrl(opts.startUrl)
  const desktopShortcut = opts.desktopShortcut !== false
  const payload = payloadRoot()
  if (!existsSync(join(payload, 'electron')) || !existsSync(join(payload, 'app'))) {
    throw new Error(
      'Payload de instalação ausente. Reinstale a partir do instalador oficial ou rode npm run prepare-payload.',
    )
  }

  report(5, 'Preparando instalação…')
  tryReleaseWindowsLocks()

  const stagingDir = join(tmpdir(), `acomopms-staging-${process.pid}-${Date.now()}`)
  mkdirSync(stagingDir, { recursive: true })

  try {
    report(25, 'Copiando arquivos do AcompOPMS…')
    copyPayloadToStaging(payload, stagingDir)
    renameElectronBinary(stagingDir)

    report(55, 'Gravando configuração do servidor…')
    const configBody = {
      startUrl,
      discoverConnection: true,
      windowTitle: 'AcompOPMS',
    }
    writeFileSync(
      join(stagingDir, CONFIG_FILENAME),
      `${JSON.stringify(configBody, null, 2)}\n`,
      'utf8',
    )

    report(75, 'Finalizando pasta de instalação…')
    retireInstallDir(installDir)
    mkdirSync(dirname(installDir), { recursive: true })
    promoteStagingToInstall(stagingDir, installDir)

    report(90, 'Criando atalho…')
    createDesktopShortcutIfRequested({
      desktopShortcut,
      installDir,
      exeName: clientExeName(),
    })

    report(100, 'Instalação concluída.')
    return { installDir, startUrl, exePath: join(installDir, clientExeName()) }
  } finally {
    cleanupDir(stagingDir)
  }
}
