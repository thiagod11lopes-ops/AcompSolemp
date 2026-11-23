import { cpSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { isStatDirectory, safeLstat } from './fs-safe.mjs'

function copyRecursive(src, dest) {
  mkdirSync(dest, { recursive: true })
  for (const name of readdirSync(src)) {
    const from = join(src, name)
    const to = join(dest, name)
    const st = safeLstat(from)
    if (isStatDirectory(st)) {
      copyRecursive(from, to)
    } else {
      mkdirSync(dirname(to), { recursive: true })
      cpSync(from, to)
    }
  }
}

function robocopyMirror(src, dest) {
  const r = spawnSync(
    'robocopy',
    [src, dest, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS'],
    { encoding: 'utf8', windowsHide: true },
  )
  const code = r.status ?? 0
  if (code >= 8) {
    throw new Error(`robocopy falhou (código ${code})`)
  }
}

/**
 * @param {string} payloadRoot pasta com electron/ e app/
 * @param {string} stagingDir destino temporário
 */
export function copyPayloadToStaging(payloadRoot, stagingDir) {
  const electronSrc = join(payloadRoot, 'electron')
  const appSrc = join(payloadRoot, 'app')
  mkdirSync(stagingDir, { recursive: true })

  if (process.platform === 'win32') {
    robocopyMirror(electronSrc, stagingDir)
    mkdirSync(join(stagingDir, 'resources', 'app'), { recursive: true })
    robocopyMirror(appSrc, join(stagingDir, 'resources', 'app'))
  } else {
    copyRecursive(electronSrc, stagingDir)
    mkdirSync(join(stagingDir, 'resources', 'app'), { recursive: true })
    copyRecursive(appSrc, join(stagingDir, 'resources', 'app'))
  }
}

export function retireInstallDir(installDir) {
  if (!safeLstat(installDir)) return
  const retired = `${installDir}.old-${Date.now()}`
  try {
    renameSync(installDir, retired)
  } catch {
    /* best effort */
  }
}

export function promoteStagingToInstall(stagingDir, installDir) {
  mkdirSync(dirname(installDir), { recursive: true })
  if (process.platform === 'win32') {
    robocopyMirror(stagingDir, installDir)
  } else {
    copyRecursive(stagingDir, installDir)
  }
}

export function cleanupDir(dir) {
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
}
