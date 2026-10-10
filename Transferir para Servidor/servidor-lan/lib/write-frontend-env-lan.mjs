import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './load-servidor-env.mjs'

const root = resolve(SERVIDOR_LAN_DIR, '../..')
const frontendDir = resolve(root, 'frontend')

function readAnonKey() {
  let out
  try {
    out = execSync('supabase status -o env', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch {
    throw new Error('Supabase local nao esta rodando. Execute: supabase start')
  }
  const line = out.split('\n').find((l) => l.startsWith('ANON_KEY='))
  if (!line) throw new Error('ANON_KEY nao encontrado em supabase status')
  return line.replace(/^ANON_KEY="?/, '').replace(/"$/, '').trim()
}

/** @param {string} [envFilePath] */
export function writeFrontendEnvLan(envFilePath) {
  const cfg = loadServidorEnv(envFilePath)
  const anonKey = readAnonKey()
  const origin = cfg.publicOrigin.replace(/\/+$/, '')

  const body = [
    '# Gerado por servidor-lan/lib/write-frontend-env-lan.mjs — nao commitar',
    'VITE_DATA_SOURCE=supabase',
    `VITE_SUPABASE_URL=${origin}`,
    `VITE_SUPABASE_ANON_KEY=${anonKey}`,
    '',
  ].join('\n')

  const outPath = resolve(frontendDir, '.env.production.local')
  writeFileSync(outPath, body, 'utf8')

  return { outPath, publicOrigin: origin, anonKeyLength: anonKey.length }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = writeFrontendEnvLan()
  console.log(`[servidor-lan] Gravado: ${r.outPath}`)
  console.log(`[servidor-lan] VITE_SUPABASE_URL=${r.publicOrigin}`)
}
