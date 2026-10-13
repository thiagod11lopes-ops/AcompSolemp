#!/usr/bin/env node
/**
 * Etapa 16 — valida um .dump (pg_restore --list) e metadados .meta.json opcionais.
 * Uso: node verificar-backup-local.mjs --file backups/foo.dump
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pgRestoreList } from './lib/run-pg-tool.mjs'
import { defaultBackupDir } from './lib/backup-paths.mjs'

const args = process.argv.slice(2)
let file = null

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && args[i + 1]) file = args[++i]
}

if (!file) {
  const dir = defaultBackupDir()
  if (!existsSync(dir)) {
    console.error('Nenhum --file e pasta backups/ ausente.')
    process.exit(1)
  }
  const dumps = readdirSync(dir)
    .filter((f) => f.endsWith('.dump'))
    .sort()
    .reverse()
  if (!dumps.length) {
    console.error('Nenhum .dump em backups/.')
    process.exit(1)
  }
  file = resolve(dir, dumps[0])
  console.log(`Usando backup mais recente: ${file}`)
} else {
  file = resolve(process.cwd(), file)
}

if (!existsSync(file)) {
  console.error(`Arquivo não encontrado: ${file}`)
  process.exit(1)
}

const list = pgRestoreList(file)
const metaPath = file.replace(/\.dump$/i, '.meta.json')
let meta = null
if (existsSync(metaPath)) {
  try {
    meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  } catch {
    meta = null
  }
}

console.log('=== Etapa 16 — Verificar backup ===')
console.log(`Dump: ${file}`)
console.log(`pg_restore --list: ${list.ok ? 'OK' : 'FALHOU'} (${list.mode})`)
if (meta) {
  console.log(`Meta: ${meta.createdAt ?? '?'} | commit ${meta.gitCommit ?? 'n/d'}`)
}

if (!list.ok) {
  if (list.output) console.error(list.output.slice(0, 500))
  process.exit(1)
}
console.log('✅ Backup íntegro (formato custom pg_restore).')
