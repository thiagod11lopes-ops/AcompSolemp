#!/usr/bin/env node
/**
 * Etapa 16 — restaura dump pg_dump -Fc no Postgres local.
 * Uso: node restaurar-banco-local.mjs --file backups/....dump --confirm
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { resolveLocalDbUrl, repoRootFromLanDir } from './lib/local-db-url.mjs'
import { pgRestoreFromFile } from './lib/run-pg-tool.mjs'
import { SERVIDOR_LAN_DIR } from './lib/load-servidor-env.mjs'

const args = process.argv.slice(2)
let file = null
let confirm = false
let stopCaddy = true

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && args[i + 1]) file = args[++i]
  else if (args[i] === '--confirm') confirm = true
  else if (args[i] === '--no-stop-caddy') stopCaddy = false
}

if (!file) {
  console.error('Uso: node restaurar-banco-local.mjs --file <caminho.dump> --confirm')
  process.exit(1)
}

const dumpPath = resolve(process.cwd(), file)
if (!existsSync(dumpPath)) {
  console.error(`Arquivo não encontrado: ${dumpPath}`)
  process.exit(1)
}

if (!confirm) {
  console.error('Restore destrutivo: repita com --confirm após backup recente.')
  process.exit(1)
}

const root = repoRootFromLanDir()
const dbUrl = resolveLocalDbUrl({ root, requireRunning: true })

console.log('=== Etapa 16 — Restore Postgres local ===')
console.log(`Origem: ${dumpPath}`)
console.log('AVISO: substitui dados atuais (public, auth, …) do cluster local.')

if (stopCaddy) {
  const stopPs1 = resolve(SERVIDOR_LAN_DIR, 'stop-servidor-lan.ps1')
  const stopSh = resolve(SERVIDOR_LAN_DIR, 'stop-servidor-lan.sh')
  if (process.platform === 'win32' && existsSync(stopPs1)) {
    spawnSync(
      'powershell',
      ['-ExecutionPolicy', 'Bypass', '-File', stopPs1],
      { stdio: 'inherit' },
    )
  } else if (existsSync(stopSh)) {
    spawnSync('bash', [stopSh], { stdio: 'inherit' })
  }
}

pgRestoreFromFile(dbUrl, dumpPath, { root })

console.log('✅ Restore concluído. Reinicie Caddy (start-servidor-lan) e valide com rodar-testes-lan.')
