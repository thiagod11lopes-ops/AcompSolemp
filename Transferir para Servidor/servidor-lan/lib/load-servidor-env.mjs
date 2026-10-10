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

/** @returns {{ lanHost: string, httpPort: number, supabaseInternal: string, publicOrigin: string, supabasePublicUrl: string }} */
export function loadServidorEnv(envPath = resolve(SERVIDOR_LAN_DIR, 'servidor.env')) {
  const defaults = {
    ACOMOPMS_LAN_HOST: 'auto',
    ACOMOPMS_HTTP_PORT: '8080',
    ACOMOPMS_SUPABASE_INTERNAL: 'http://127.0.0.1:54321',
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
  return {
    lanHost,
    httpPort,
    supabaseInternal,
    publicOrigin,
    supabasePublicUrl,
  }
}
