#!/usr/bin/env node
/**
 * Etapa 2 + 5 — site_url e redirects LAN (+ overlay quando habilitado).
 * Etapa 7 — site_url canonico Tailscale e redirects via collectAuthRedirectOrigins(cfg).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './lib/load-servidor-env.mjs'
import {
  applySupabaseAuthConfigToToml,
  buildSupabaseAuthConfigFromServidorCfg,
} from './lib/configure-auth-lan.mjs'

const root = resolve(SERVIDOR_LAN_DIR, '../..')
const configPath = resolve(root, 'supabase/config.toml')

if (!existsSync(configPath)) {
  console.error(`[servidor-lan] Nao encontrado: ${configPath}`)
  process.exit(1)
}

const cfg = loadServidorEnv()
const authPatch = buildSupabaseAuthConfigFromServidorCfg(cfg)

let text = readFileSync(configPath, 'utf8')
text = applySupabaseAuthConfigToToml(text, authPatch)
writeFileSync(configPath, text, 'utf8')

console.log(`[servidor-lan] Auth: site_url=${authPatch.siteUrl}`)
if (cfg.overlayEnabled && cfg.overlayOrigin) {
  console.log(`[servidor-lan] Auth overlay redirects: ${cfg.overlayOrigin}`)
}
console.log(`[servidor-lan] Redirects: ${authPatch.additionalRedirectUrls.length} entradas`)
console.log('[servidor-lan] Proximo: supabase stop && supabase start')
