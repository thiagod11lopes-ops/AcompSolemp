#!/usr/bin/env node
/**
 * Etapa 2 — Atualiza site_url e redirect URLs no supabase/config.toml para o servidor LAN.
 * Sempre rode `supabase stop && supabase start` na raiz do repo depois deste script.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './lib/load-servidor-env.mjs'

const root = resolve(SERVIDOR_LAN_DIR, '../..')
const configPath = resolve(root, 'supabase/config.toml')

if (!existsSync(configPath)) {
  console.error(`[servidor-lan] Nao encontrado: ${configPath}`)
  console.error('Execute supabase init na raiz do repositorio antes.')
  process.exit(1)
}

const { lanHost, httpPort, publicOrigin } = loadServidorEnv()
const siteUrl = publicOrigin.replace(/\/+$/, '')

/** @param {string} origin */
function redirectSet(origin) {
  const o = origin.replace(/\/+$/, '')
  return [
    o,
    `${o}/**`,
    `${o}/login`,
    `${o}/login/**`,
    `${o}/redefinir-senha`,
    `${o}/redefinir-senha/**`,
  ]
}

const redirects = [
  ...redirectSet(siteUrl),
  ...redirectSet(`http://127.0.0.1:${httpPort}`),
  ...redirectSet(`http://localhost:${httpPort}`),
  // Dev Vite (nao remover)
  'http://localhost:5173',
  'http://localhost:5173/**',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5173/**',
]

const uniqueRedirects = [...new Set(redirects)]
const redirectsToml = `[${uniqueRedirects.map((u) => `"${u}"`).join(', ')}]`

let text = readFileSync(configPath, 'utf8')

if (!/^\[auth\]/m.test(text)) {
  console.error('[servidor-lan] Secao [auth] nao encontrada em config.toml')
  process.exit(1)
}

const siteReplaced = text.replace(/^site_url\s*=\s*"[^"]*"\s*$/m, `site_url = "${siteUrl}"`)
if (siteReplaced === text) {
  console.warn('[servidor-lan] site_url nao substituido — confira formato em config.toml')
}
text = siteReplaced

const redirectReplaced = text.replace(
  /^additional_redirect_urls\s*=\s*\[[\s\S]*?\]\s*$/m,
  `additional_redirect_urls = ${redirectsToml}`,
)
if (redirectReplaced === text) {
  console.error('[servidor-lan] additional_redirect_urls nao encontrado em config.toml')
  process.exit(1)
}
text = redirectReplaced

writeFileSync(configPath, text, 'utf8')

console.log(`[servidor-lan] Auth LAN: site_url=${siteUrl}`)
console.log(`[servidor-lan] Host detectado/configurado: ${lanHost}:${httpPort}`)
console.log(`[servidor-lan] Redirects: ${uniqueRedirects.length} entradas`)
console.log('[servidor-lan] Proximo passo: supabase stop && supabase start (na raiz do repo)')
