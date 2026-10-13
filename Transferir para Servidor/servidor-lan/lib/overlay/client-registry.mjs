import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { OVERLAY_DIR } from './overlay-paths.mjs'

const REGISTRY_PATH = resolve(OVERLAY_DIR, 'paired-clients.json')

function loadRegistry() {
  if (!existsSync(REGISTRY_PATH)) {
    return { schema: 'acomopms-paired-clients/1', clients: [], nextSuffix: 2 }
  }
  return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))
}

function saveRegistry(reg) {
  mkdirSync(OVERLAY_DIR, { recursive: true })
  writeFileSync(REGISTRY_PATH, `${JSON.stringify(reg, null, 2)}\n`, 'utf8')
}

/**
 * @param {string} subnet ex. 100.64.0.0/24
 * @param {number} hostLastOctet
 */
function addressFromSubnet(subnet, hostLastOctet) {
  const base = subnet.split('/')[0].split('.')
  if (base.length !== 4) throw new Error(`subnet inválida: ${subnet}`)
  base[3] = String(hostLastOctet)
  return `${base.join('.')}/32`
}

/**
 * @param {{ name: string, publicKey: string, subnet: string }} opts
 */
export function registerClient(opts) {
  const reg = loadRegistry()
  const suffix = reg.nextSuffix ?? 2
  const address = addressFromSubnet(opts.subnet, suffix)
  const id = `client-${suffix}`
  const entry = {
    id,
    name: opts.name,
    address,
    publicKey: opts.publicKey,
    pairedAt: new Date().toISOString(),
  }
  reg.clients.push(entry)
  reg.nextSuffix = suffix + 1
  saveRegistry(reg)
  return entry
}

export function listPairedClients() {
  return loadRegistry().clients
}

export { REGISTRY_PATH }
