#!/usr/bin/env node
/**
 * Atualiza site_url e redirect URLs no supabase/config.toml para o servidor LAN.
 * Rode antes de `supabase stop && supabase start` quando mudar o IP em servidor.env.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './lib/load-servidor-env.mjs'

const root = resolve(SERVIDOR_LAN_DIR, '../..')
const configPath = resolve(root, 'supabase/config.toml')
const { lanHost, httpPort, publicOrigin } = loadServidorEnv()

const siteUrl = publicOrigin
const redirects = [
  siteUrl,
  `${siteUrl}/**`,
  `http://127.0.0.1:${httpPort}`,
  `http://127.0.0.1:${httpPort}/**`,
  `http://localhost:${httpPort}`,
  `http://localhost:${httpPort}/**`,
  `http://${lanHost}:${httpPort}/redefinir-senha`,
  // Dev local (Vite) — não remove o fluxo de desenvolvimento
  'http://localhost:5173',
  'http://localhost:5173/**',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5173/**',
]
const redirectsToml = `[${redirects.map((u) => `"${u}"`).join(', ')}]`

let text = readFileSync(configPath, 'utf8')
text = text.replace(/^site_url\s*=\s*"[^"]*"$/m, `site_url = "${siteUrl}"`)
// Apenas a linha do array (sem flag /s — evita corromper o resto do config.toml)
text = text.replace(
  /^additional_redirect_urls\s*=\s*\[[^\]]*\]\s*$/m,
  `additional_redirect_urls = ${redirectsToml}`,
)

writeFileSync(configPath, text, 'utf8')
console.log(`[servidor-lan] Auth configurado: site_url=${siteUrl} (host LAN ${lanHost}:${httpPort})`)
console.log('[servidor-lan] Reinicie o Supabase: supabase stop && supabase start')
