import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isTailscaleCgcatIpv4,
  isValidTsNetHostname,
  loadServidorEnv,
  parseAccessMode,
  SERVIDOR_LAN_DIR,
} from './load-servidor-env.mjs'

const root = resolve(SERVIDOR_LAN_DIR, '../..')
const frontendDir = resolve(root, 'frontend')

function readAnonKey() {
  let out
  try {
    out = execSync('supabase status -o env', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch {
    throw new Error('Supabase local nao esta rodando. Execute: supabase start')
  }
  const line = out.split('\n').find((l) => l.startsWith('ANON_KEY='))
  if (!line) throw new Error('ANON_KEY nao encontrado em supabase status')
  const key = line.replace(/^ANON_KEY="?/, '').replace(/"$/, '').trim()
  assertAnonKeySafeForFrontendBundle(key)
  return key
}

/** Apenas anon/public — nunca service_role ou JWT de privilegio elevado no bundle Vite. */
export function assertAnonKeySafeForFrontendBundle(anonKey) {
  const key = String(anonKey ?? '').trim()
  if (!key) throw new Error('ANON_KEY vazio')
  if (/service_role/i.test(key)) {
    throw new Error('SERVICE_ROLE_KEY nao pode ser gravada no frontend')
  }
}

function resolveAccessMode(cfg) {
  if (cfg.accessMode === 'internet' || cfg.accessMode === 'local') return cfg.accessMode
  if (cfg.envVars) return parseAccessMode(cfg.envVars)
  return null
}

/** @param {string} publicOrigin */
export function assertPublicOriginForAccessMode(cfg, publicOrigin) {
  const mode = resolveAccessMode(cfg)
  if (mode !== 'internet') return
  let host
  try {
    host = new URL(publicOrigin).hostname.toLowerCase()
  } catch {
    throw new Error(`Origem publica invalida para frontend: ${publicOrigin}`)
  }
  if (!isValidTsNetHostname(host) && !isTailscaleCgcatIpv4(host)) {
    throw new Error(
      `Modo internet: VITE_SUPABASE_URL deve usar host Tailscale (MagicDNS ou 100.x), obtido: ${host}`,
    )
  }
}

/**
 * Linhas do `.env.production.local` (somente variaveis VITE_ publicas).
 * @param {ReturnType<typeof loadServidorEnv>} cfg
 * @param {string} anonKey
 */
export function buildFrontendProductionEnvContent(cfg, anonKey) {
  assertAnonKeySafeForFrontendBundle(anonKey)
  const origin = cfg.publicOrigin.replace(/\/+$/, '')
  assertPublicOriginForAccessMode(cfg, origin)

  return [
    '# Gerado por servidor-lan/lib/write-frontend-env-lan.mjs — nao commitar',
    'VITE_DATA_SOURCE=supabase',
    `VITE_SUPABASE_URL=${origin}`,
    `VITE_SUPABASE_ANON_KEY=${anonKey}`,
    '',
  ].join('\n')
}

/**
 * @param {string} [envFilePath]
 * @param {{ readAnonKey?: () => string }} [options]
 */
export function writeFrontendEnvLan(envFilePath, options = {}) {
  const cfg = loadServidorEnv(envFilePath)
  const readKey = options.readAnonKey ?? readAnonKey
  const anonKey = readKey()
  const body = buildFrontendProductionEnvContent(cfg, anonKey)

  const outPath = resolve(frontendDir, '.env.production.local')
  writeFileSync(outPath, body, 'utf8')

  return { outPath, publicOrigin: cfg.publicOrigin.replace(/\/+$/, ''), anonKeyLength: anonKey.length }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = writeFrontendEnvLan()
  console.log(`[servidor-lan] Gravado: ${r.outPath}`)
  console.log(`[servidor-lan] VITE_SUPABASE_URL=${r.publicOrigin}`)
}
