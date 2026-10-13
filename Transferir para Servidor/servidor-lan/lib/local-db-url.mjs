import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SERVIDOR_LAN_DIR } from './load-servidor-env.mjs'

export const DEFAULT_LOCAL_DB_URL =
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

export function repoRootFromLanDir() {
  return resolve(SERVIDOR_LAN_DIR, '../..')
}

/** @param {string} envText */
export function parseDbUrlFromSupabaseStatusEnv(envText) {
  for (const line of envText.split('\n')) {
    const t = line.trim()
    if (!t.startsWith('DB_URL=')) continue
    let v = t.slice('DB_URL='.length).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (v.startsWith('postgresql://')) return v
  }
  return null
}

/**
 * @param {{ root?: string, envDbUrl?: string | null, requireRunning?: boolean }} [opts]
 */
export function resolveLocalDbUrl(opts = {}) {
  const root = opts.root ?? repoRootFromLanDir()
  const fromEnv = process.env.SUPABASE_DB_URL?.trim() || opts.envDbUrl?.trim()
  if (fromEnv) return fromEnv

  try {
    const out = execSync('supabase status -o env', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const parsed = parseDbUrlFromSupabaseStatusEnv(out)
    if (parsed) return parsed
  } catch (e) {
    if (opts.requireRunning) {
      throw new Error(
        'Supabase local não está rodando. Execute: supabase start (ou defina SUPABASE_DB_URL).',
        { cause: e },
      )
    }
  }

  return DEFAULT_LOCAL_DB_URL
}

/** URL vista de dentro do container supabase_db_* (porta 5432, não 54322). */
export function dbUrlForDockerExec(dbUrl) {
  try {
    const u = new URL(dbUrl)
    if ((u.hostname === '127.0.0.1' || u.hostname === 'localhost') && u.port === '54322') {
      u.port = '5432'
      return u.toString()
    }
  } catch {
    /* ignore */
  }
  return dbUrl
}

export function readProjectIdFromConfig(
  configPath = resolve(repoRootFromLanDir(), 'supabase/config.toml'),
) {
  if (!existsSync(configPath)) return 'workspace'
  for (const line of readFileSync(configPath, 'utf8').split('\n')) {
    const m = line.match(/^project_id\s*=\s*"([^"]+)"/)
    if (m) return m[1]
  }
  return 'workspace'
}
