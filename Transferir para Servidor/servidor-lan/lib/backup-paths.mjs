import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { SERVIDOR_LAN_DIR } from './load-servidor-env.mjs'

/** @param {Date} [d] */
export function formatBackupTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  )
}

/** @param {Date} [d] @param {string} [dir] */
export function buildBackupBasename(d = new Date(), prefix = 'acomopms-local') {
  return `${prefix}-${formatBackupTimestamp(d)}`
}

/** @param {string} [dir] */
export function defaultBackupDir(dir) {
  return resolve(dir ?? SERVIDOR_LAN_DIR, 'backups')
}

/** @param {string} [dir] */
export function ensureBackupDir(dir) {
  const target = defaultBackupDir(dir)
  mkdirSync(target, { recursive: true })
  return target
}

/**
 * @param {string} basename
 * @param {string} [dir]
 */
export function backupArtifactPaths(basename, dir) {
  const root = ensureBackupDir(dir)
  return {
    dir: root,
    dumpPath: resolve(root, `${basename}.dump`),
    metaPath: resolve(root, `${basename}.meta.json`),
  }
}
