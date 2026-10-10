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
  let lanHost = vars.ACOMOPMS_LAN_HOST
  if (!lanHost || lanHost === 'auto') {
    lanHost = detectLanHost()
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
    envVars: vars,
  }
}
