#!/usr/bin/env node
/**
 * Etapa 16 — backup Postgres (Supabase local) via pg_dump formato custom (-Fc).
 * Uso: node backup-banco-local.mjs [--out-dir DIR] [--label NOME]
 */
import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { resolveLocalDbUrl, repoRootFromLanDir } from './lib/local-db-url.mjs'
import { buildBackupBasename, backupArtifactPaths } from './lib/backup-paths.mjs'
import { pgDumpToFile } from './lib/run-pg-tool.mjs'

const args = process.argv.slice(2)
let outDir = null
let label = ''

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out-dir' && args[i + 1]) {
    outDir = args[++i]
  } else if (args[i] === '--label' && args[i + 1]) {
    label = args[++i]
  }
}

const root = repoRootFromLanDir()
const dbUrl = resolveLocalDbUrl({ root, requireRunning: true })
const basename = buildBackupBasename(new Date(), label ? `acomopms-${label}` : 'acomopms-local')
const paths = backupArtifactPaths(basename, outDir ? resolve(outDir) : undefined)

console.log('=== Etapa 16 — Backup Postgres local ===')
console.log(`Destino: ${paths.dumpPath}`)

pgDumpToFile(dbUrl, paths.dumpPath, { root })

let gitSha = null
try {
  gitSha = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim()
} catch {
  gitSha = null
}

const meta = {
  schema: 'acomopms-local-backup/1',
  createdAt: new Date().toISOString(),
  dbUrlHost: '127.0.0.1:54322',
  format: 'pg_dump-custom-Fc',
  dumpFile: `${basename}.dump`,
  gitCommit: gitSha,
  notes:
    'Contém schemas public + auth (+ demais do cluster local). Não commitar dumps — copie para mídia externa.',
}

writeFileSync(paths.metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8')

console.log(`Metadados: ${paths.metaPath}`)
console.log('✅ Backup concluído')
