import { existsSync, readFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const SERVIDOR_LAN_DIR = resolve(here, '..')

export function detectLanHost() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return '127.0.0.1'
}

function parseBool(v, fallback = false) {
  if (v == null || v === '') return fallback
  const s = String(v).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(s)) return true
  if (['0', 'false', 'no', 'off'].includes(s)) return false
  return fallback
}

/** @returns {'internet' | 'local' | null} */
export function parseAccessMode(vars) {
  const raw = vars?.ACOMOPMS_ACCESS_MODE
  if (raw == null || String(raw).trim() === '') return null
  const mode = String(raw).trim().toLowerCase()
  if (mode === 'internet') return 'internet'
  if (mode === 'local') return 'local'
  return null
}

export function isValidTsNetHostname(hostname) {
  const lower = String(hostname).trim().toLowerCase().replace(/\.$/, '')
  if (!lower.endsWith('.ts.net') || lower.length > 253) return false
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.ts\.net$/.test(
    lower,
  )
}

export function isTailscaleCgcatIpv4(value) {
  const m = /^100\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(value).trim())
  if (!m) return false
  const octets = [100, Number(m[1]), Number(m[2]), Number(m[3])]
  if (!octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) return false
  return octets[1] >= 64 && octets[1] <= 127
}

/**
 * Host público explícito para modo internet (MagicDNS ou IPv4 tailnet).
 * @param {string} configured
 * @returns {string | null}
 */
export function resolveInternetExplicitHost(configured) {
  const trimmed = String(configured).trim().replace(/\.$/, '')
  if (!trimmed || trimmed === 'auto') return null
  if (isValidTsNetHostname(trimmed)) return trimmed.toLowerCase()
  if (isTailscaleCgcatIpv4(trimmed)) return trimmed
  return null
}

/**
 * @param {Record<string, string>} vars
 * @returns {{ ok: true, host: string } | { ok: true, useDetect: true } | { ok: false, message: string }}
 */
export function resolveConfiguredLanHost(vars) {
  const accessMode = parseAccessMode(vars)
  const configured = (vars.ACOMOPMS_LAN_HOST ?? '').trim()

  if (accessMode === 'internet') {
    const host = resolveInternetExplicitHost(configured)
    if (!host) {
      const detail =
        !configured || configured === 'auto'
          ? 'defina ACOMOPMS_LAN_HOST com MagicDNS (*.ts.net) ou IPv4 Tailscale (100.64.0.0/10)'
          : `valor invalido: ${configured}`
      return {
        ok: false,
        message: `Modo internet (Tailscale): ${detail}.`,
      }
    }
    return { ok: true, host }
  }

  if (!configured || configured === 'auto') {
    return { ok: true, useDetect: true }
  }

  return { ok: true, host: configured }
}

/** @returns {{
 *   lanHost: string,
 *   httpPort: number,
 *   supabaseInternal: string,
 *   publicOrigin: string,
 *   supabasePublicUrl: string,
 *   loginUrl: string,
 *   overlayEnabled: boolean,
 *   overlayHost: string | null,
 *   overlay: Record<string, string>,
 *   accessMode: 'internet' | 'local' | null,
 * }} */
export function loadServidorEnv(envPath = resolve(SERVIDOR_LAN_DIR, 'servidor.env')) {
  const defaults = {
    ACOMOPMS_LAN_HOST: 'auto',
    ACOMOPMS_HTTP_PORT: '8080',
    ACOMOPMS_SUPABASE_INTERNAL: 'http://127.0.0.1:54321',
    ACOMOPMS_OVERLAY_ENABLED: 'false',
    ACOMOPMS_OVERLAY_HOST: '',
    ACOMOPMS_OVERLAY_HEADSCALE_URL: '',
    ACOMOPMS_OVERLAY_NAMESPACE: 'acomopms',
    ACOMOPMS_OVERLAY_SERVER_NAME: '',
    ACOMOPMS_OVERLAY_WG_PORT: '51820',
    ACOMOPMS_OVERLAY_PUBLIC_ENDPOINT: '',
    ACOMOPMS_OVERLAY_SUBNET: '100.64.0.0/24',
    ACOMOPMS_OVERLAY_SERVER_ADDRESS: '100.64.0.1/32',
  }
  const vars = { ...defaults }
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i <= 0) continue
      vars[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
  }

  const accessMode = parseAccessMode(vars)
  const resolved = resolveConfiguredLanHost(vars)
  if (!resolved.ok) {
    throw new Error(resolved.message)
  }

  let lanHost
  if ('useDetect' in resolved && resolved.useDetect) {
    lanHost = detectLanHost()
  } else {
    lanHost = resolved.host
  }

  const httpPort = Number.parseInt(vars.ACOMOPMS_HTTP_PORT, 10) || 8080
  const supabaseInternal = vars.ACOMOPMS_SUPABASE_INTERNAL.replace(/\/+$/, '')
  const publicOrigin = `http://${lanHost}:${httpPort}`
  // API Supabase via mesmo host/porta (Caddy faz proxy de /auth, /rest, …)
  const supabasePublicUrl = publicOrigin
  const loginUrl = `${publicOrigin.replace(/\/+$/, '')}/login`

  const overlayEnabled = parseBool(vars.ACOMOPMS_OVERLAY_ENABLED, false)
  let overlayHost = vars.ACOMOPMS_OVERLAY_HOST?.trim() || null
  if (overlayEnabled && !overlayHost) overlayHost = null

  const overlay = {
    enabled: overlayEnabled,
    host: overlayHost,
    headscaleUrl: vars.ACOMOPMS_OVERLAY_HEADSCALE_URL?.trim() || null,
    namespace: vars.ACOMOPMS_OVERLAY_NAMESPACE?.trim() || 'acomopms',
    serverName: vars.ACOMOPMS_OVERLAY_SERVER_NAME?.trim() || null,
    wgPort: Number.parseInt(vars.ACOMOPMS_OVERLAY_WG_PORT, 10) || 51820,
    publicEndpoint: vars.ACOMOPMS_OVERLAY_PUBLIC_ENDPOINT?.trim() || null,
  }

  const overlayOrigin =
    overlayEnabled && overlayHost ? `http://${overlayHost}:${httpPort}` : null
  const overlayLoginUrl = overlayOrigin ? `${overlayOrigin}/login` : null

  return {
    lanHost,
    httpPort,
    supabaseInternal,
    publicOrigin,
    supabasePublicUrl,
    loginUrl,
    overlayEnabled,
    overlayHost,
    overlay,
    overlayOrigin,
    overlayLoginUrl,
    accessMode,
    envVars: vars,
  }
}
