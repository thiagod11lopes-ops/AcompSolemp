#!/usr/bin/env node
/**
 * Etapa 5 — configura overlay WireGuard no servidor (chaves, conf, estado).
 * Requer: ACOMOPMS_OVERLAY_ENABLED=true e wg no PATH.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './lib/load-servidor-env.mjs'
import { generateWireGuardKeyPair, isWireGuardCliAvailable } from './lib/overlay/wireguard-keys.mjs'
import { buildServerWireGuardConf } from './lib/overlay/server-wireguard-conf.mjs'
import {
  OVERLAY_STATE_PATH,
  WG_SERVER_KEY_PATH,
  WG_SERVER_CONF_PATH,
  OVERLAY_DIR,
} from './lib/overlay/overlay-paths.mjs'

const envPath = process.env.ACOMOPMS_SERVIDOR_ENV || `${SERVIDOR_LAN_DIR}/servidor.env`
const cfg = loadServidorEnv(envPath)

function fail(msg) {
  console.error(`[overlay] ${msg}`)
  process.exit(1)
}

function publicKeyFromPrivate(privateKey) {
  const r = spawnSync('wg', ['pubkey'], { encoding: 'utf8', input: privateKey, windowsHide: true })
  if (r.status !== 0) throw new Error('wg pubkey falhou')
  return r.stdout.trim()
}

if (!cfg.overlayEnabled) {
  console.log('[overlay] ACOMOPMS_OVERLAY_ENABLED=false — nada a fazer.')
  process.exit(0)
}

if (!cfg.overlayHost) {
  fail('Defina ACOMOPMS_OVERLAY_HOST (IP WireGuard deste servidor, ex.: 100.64.0.1)')
}
if (!cfg.overlay.publicEndpoint) {
  fail('Defina ACOMOPMS_OVERLAY_PUBLIC_ENDPOINT (ex.: udp://SEU_IP:51820 para encaminhar no roteador)')
}
if (!cfg.overlay.serverName) {
  fail('Defina ACOMOPMS_OVERLAY_SERVER_NAME (identificador no Headscale/Etapa 6)')
}

const subnet = cfg.envVars.ACOMOPMS_OVERLAY_SUBNET || '100.64.0.0/24'
const serverAddress = cfg.envVars.ACOMOPMS_OVERLAY_SERVER_ADDRESS || '100.64.0.1/32'

if (!isWireGuardCliAvailable()) {
  fail('WireGuard CLI (wg) não encontrado. Windows: WireGuard; Linux: wireguard-tools')
}

mkdirSync(dirname(WG_SERVER_CONF_PATH), { recursive: true })
mkdirSync(OVERLAY_DIR, { recursive: true })

let privateKey
let publicKey
if (existsSync(WG_SERVER_KEY_PATH)) {
  privateKey = readFileSync(WG_SERVER_KEY_PATH, 'utf8').trim()
  publicKey = publicKeyFromPrivate(privateKey)
} else {
  const pair = generateWireGuardKeyPair()
  privateKey = pair.privateKey
  publicKey = pair.publicKey
  writeFileSync(WG_SERVER_KEY_PATH, `${privateKey}\n`, { mode: 0o600 })
}

const conf = buildServerWireGuardConf({
  privateKey,
  address: serverAddress,
  listenPort: cfg.overlay.wgPort,
})
writeFileSync(WG_SERVER_CONF_PATH, conf, { mode: 0o600 })

const state = {
  schema: 'acomopms-overlay-state/1',
  configuredAt: new Date().toISOString(),
  serverName: cfg.overlay.serverName,
  namespace: cfg.overlay.namespace,
  headscaleUrl: cfg.overlay.headscaleUrl,
  subnet,
  serverAddress,
  listenPort: cfg.overlay.wgPort,
  overlayHost: cfg.overlayHost,
  publicEndpoint: cfg.overlay.publicEndpoint,
  serverPublicKey: publicKey,
  wireguardConfRelativePath: 'Transferir para Servidor/servidor-lan/overlay/wireguard/acomopms-server.conf',
  status: 'server-ready-etapa-6-pairing',
}
writeFileSync(OVERLAY_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8')

console.log('[overlay] Estado:', OVERLAY_STATE_PATH)
console.log('[overlay] Conf:', WG_SERVER_CONF_PATH)
console.log('[overlay] Chave pública servidor:', publicKey)
console.log('[overlay] Host overlay (app):', cfg.overlayLoginUrl)
console.log('[overlay] Proximo: aplicar-auth-lan, supabase restart, firewall UDP, start-overlay-servidor')
