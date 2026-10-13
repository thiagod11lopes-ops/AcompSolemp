import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateConnectionJson } from '../../cliente/lib/overlay/connection-json.mjs'

/**
 * @param {string} sourcePath caminho escolhido pelo usuário
 * @param {string} stagingDir
 */
export function copyConnectionJsonToStaging(sourcePath, stagingDir) {
  if (!sourcePath?.trim()) return false
  const raw = JSON.parse(readFileSync(sourcePath, 'utf8'))
  validateConnectionJson(raw)
  writeFileSync(join(stagingDir, 'connection.json'), `${JSON.stringify(raw, null, 2)}\n`, {
    mode: 0o600,
  })
  return true
}
