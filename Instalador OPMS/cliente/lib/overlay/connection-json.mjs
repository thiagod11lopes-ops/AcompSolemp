import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SCHEMA = 'acomopms-connection/1'

/**
 * @param {unknown} data
 */
export function validateConnectionJson(data) {
  if (!data || typeof data !== 'object') throw new Error('connection.json inválido')
  if (data.schema !== SCHEMA) {
    throw new Error(`connection.json: schema esperado ${SCHEMA}`)
  }
  const wg = data.overlay?.wireguard
  if (!data.overlay?.enabled) throw new Error('connection.json: overlay.enabled deve ser true')
  if (!wg?.privateKey || !wg?.peer?.publicKey || !wg?.peer?.endpoint) {
    throw new Error('connection.json: wireguard incompleto (privateKey, peer.publicKey, endpoint)')
  }
  if (!wg.address) throw new Error('connection.json: wireguard.address obrigatório')
  return /** @type {import('./types.mjs').ConnectionDocument} */ (data)
}

/**
 * @param {string} installDir
 */
export function connectionJsonPath(installDir) {
  return join(installDir, 'connection.json')
}

/**
 * @param {string} installDir
 */
export function loadConnectionJson(installDir) {
  const p = connectionJsonPath(installDir)
  if (!existsSync(p)) return null
  const raw = JSON.parse(readFileSync(p, 'utf8'))
  return validateConnectionJson(raw)
}
