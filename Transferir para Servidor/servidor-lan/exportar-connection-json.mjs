#!/usr/bin/env node
/**
 * Etapa 6 — gera connection.json para um cliente (pareamento overlay).
 * Uso: node exportar-connection-json.mjs --name "PC-1" [--out caminho]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './lib/load-servidor-env.mjs'
import { OVERLAY_STATE_PATH } from './lib/overlay/overlay-paths.mjs'
import { generateWireGuardKeyPair, isWireGuardCliAvailable } from './lib/overlay/wireguard-keys.mjs'
import { registerClient } from './lib/overlay/client-registry.mjs'
import { appendPeerToServerConf } from './lib/overlay/append-server-peer.mjs'
import { buildConnectionDocument } from './lib/overlay/build-connection-document.mjs'

const lanDir = dirname(fileURLToPath(import.meta.url))

function parseArgs(argv) {
  let name = 'cliente'
  let out = null
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--name' && argv[i + 1]) name = argv[++i]
    else if (argv[i] === '--out' && argv[i + 1]) out = argv[++i]
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Uso: node exportar-connection-json.mjs --name "Posto-1" [--out connection.json]')
      process.exit(0)
    }
  }
  return { name, out }
}

function fail(msg) {
  console.error(`[pairing] ${msg}`)
  process.exit(1)
}

const { name, out } = parseArgs(process.argv)
const cfg = loadServidorEnv()

if (!cfg.overlayEnabled) {
  fail('ACOMOPMS_OVERLAY_ENABLED deve ser true (Etapa 5).')
}
if (!existsSync(OVERLAY_STATE_PATH)) {
  fail('overlay-state.json ausente — rode configurar-overlay-servidor.mjs (Etapa 5).')
}

const state = JSON.parse(readFileSync(OVERLAY_STATE_PATH, 'utf8'))
if (!state.serverPublicKey || !state.publicEndpoint) {
  fail('overlay-state incompleto (serverPublicKey / publicEndpoint).')
}

if (!isWireGuardCliAvailable()) {
  fail('wg não encontrado — necessário para gerar chaves do cliente.')
}

const { privateKey, publicKey } = generateWireGuardKeyPair()
const subnet = state.subnet || cfg.envVars.ACOMOPMS_OVERLAY_SUBNET || '100.64.0.0/24'
const client = registerClient({ name, publicKey, subnet })

appendPeerToServerConf({
  publicKey,
  allowedIPs: client.address,
  comment: `${name} (${client.id})`,
})

const doc = buildConnectionDocument({
  clientPrivateKey: privateKey,
  clientAddress: client.address,
  serverPublicKey: state.serverPublicKey,
  publicEndpoint: state.publicEndpoint,
  serverOverlayHost: cfg.overlayHost || state.overlayHost,
  httpPort: cfg.httpPort,
  clientName: name,
})

const exportDir = resolve(SERVIDOR_LAN_DIR, 'overlay', 'exports')
mkdirSync(exportDir, { recursive: true })
const safeName = name.replace(/[^\w.-]+/g, '_').slice(0, 40)
const outPath = out
  ? resolve(out)
  : resolve(exportDir, `connection-${safeName}-${client.id}.json`)

writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`, { mode: 0o600 })

console.log('[pairing] Cliente:', client.id, client.address)
console.log('[pairing] connection.json:', outPath)
console.log('[pairing] Peer adicionado em overlay/wireguard/acomopms-server.conf')
console.log('[pairing] Reinicie o túnel WG no servidor se já estiver ativo (wg syncconf / restart serviço).')
