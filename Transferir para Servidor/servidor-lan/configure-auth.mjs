#!/usr/bin/env node
/**
 * Etapa 2 + 5 — site_url e redirects LAN (+ overlay quando habilitado).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './lib/load-servidor-env.mjs'
import { collectAuthRedirectOrigins } from './lib/auth-redirects.mjs'

const root = resolve(SERVIDOR_LAN_DIR, '../..')
const configPath = resolve(root, 'supabase/config.toml')

if (!existsSync(configPath)) {
  console.error(`[servidor-lan] Nao encontrado: ${configPath}`)
  process.exit(1)
}

const cfg = loadServidorEnv()
const siteUrl = cfg.publicOrigin.replace(/\/+$/, '')
const uniqueRedirects = collectAuthRedirectOrigins(cfg)
const redirectsToml = `[${uniqueRedirects.map((u) => `"${u}"`).join(', ')}]`

let text = readFileSync(configPath, 'utf8')
text = text.replace(/^site_url\s*=\s*"[^"]*"\s*$/m, `site_url = "${siteUrl}"`)
text = text.replace(
  /^additional_redirect_urls\s*=\s*\[[\s\S]*?\]\s*$/m,
  `additional_redirect_urls = ${redirectsToml}`,
)
writeFileSync(configPath, text, 'utf8')

console.log(`[servidor-lan] Auth: site_url=${siteUrl}`)
if (cfg.overlayEnabled && cfg.overlayOrigin) {
  console.log(`[servidor-lan] Auth overlay redirects: ${cfg.overlayOrigin}`)
}
console.log(`[servidor-lan] Redirects: ${uniqueRedirects.length} entradas`)
console.log('[servidor-lan] Proximo: supabase stop && supabase start')
