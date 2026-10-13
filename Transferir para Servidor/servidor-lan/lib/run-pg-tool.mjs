import { spawnSync, execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import {
  dbUrlForDockerExec,
  readProjectIdFromConfig,
  repoRootFromLanDir,
} from './local-db-url.mjs'

function commandExists(name) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], {
    stdio: 'ignore',
  })
  return r.status === 0
}

export function findSupabaseDbContainer(root = repoRootFromLanDir()) {
  const projectId = readProjectIdFromConfig()
  const patterns = [`supabase_db_${projectId}`, 'supabase_db_']
  try {
    const names = execSync('docker ps --format {{.Names}}', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    for (const p of patterns) {
      const hit = names.find((n) => n === p || n.startsWith(p))
      if (hit) return hit
    }
    return names.find((n) => n.includes('supabase_db')) ?? null
  } catch {
    return null
  }
}

/**
 * @param {string[]} args restantes após nome do binário
 * @param {{ root?: string }} [opts]
 */
export function runPgTool(tool, args, opts = {}) {
  const root = opts.root ?? repoRootFromLanDir()
  if (commandExists(tool)) {
    const r = spawnSync(tool, args, { stdio: 'inherit', env: process.env })
    if (r.error) throw r.error
    if (r.status !== 0) {
      throw new Error(`${tool} saiu com código ${r.status ?? 'desconhecido'}`)
    }
    return { mode: 'host', tool }
  }

  const container = findSupabaseDbContainer(root)
  if (!container) {
    throw new Error(
      `${tool} não está no PATH e nenhum container supabase_db_* foi encontrado (Docker).`,
    )
  }

  const dockerArgs = ['exec', '-i', container, tool, ...args]
  const r = spawnSync('docker', dockerArgs, { stdio: 'inherit', env: process.env })
  if (r.error) throw r.error
  if (r.status !== 0) {
    throw new Error(`docker exec ${tool} saiu com código ${r.status ?? 'desconhecido'}`)
  }
  return { mode: 'docker', container, tool }
}

function dockerCopyIn(container, hostPath, containerPath) {
  const r = spawnSync('docker', ['cp', hostPath, `${container}:${containerPath}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  })
  if (r.status !== 0) {
    throw new Error(`docker cp falhou: ${(r.stderr ?? '').trim() || r.status}`)
  }
}

function pgDumpViaDocker(container, dbUrl, dumpPath) {
  const innerUrl = dbUrlForDockerExec(dbUrl)
  const r = spawnSync(
    'docker',
    ['exec', '-i', container, 'pg_dump', '-Fc', '--no-owner', '--no-acl', innerUrl],
    { encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  if (r.status !== 0) {
    const err = (r.stderr ?? Buffer.alloc(0)).toString('utf8')
    throw new Error(`pg_dump (docker) falhou: ${err || r.status}`)
  }
  writeFileSync(dumpPath, r.stdout)
  return { mode: 'docker', container }
}

/** @param {string} dbUrl @param {string} dumpPath @param {{ root?: string }} [opts] */
export function pgDumpToFile(dbUrl, dumpPath, opts = {}) {
  const root = opts.root ?? repoRootFromLanDir()
  const container = findSupabaseDbContainer(root)

  if (container) {
    return pgDumpViaDocker(container, dbUrl, dumpPath)
  }

  if (commandExists('pg_dump')) {
    return runPgTool(
      'pg_dump',
      ['-Fc', '--no-owner', '--no-acl', '-f', dumpPath, dbUrl],
      { root },
    )
  }

  throw new Error('pg_dump indisponível e container Supabase DB não encontrado.')
}

/** @param {string} dbUrl @param {string} dumpPath @param {{ root?: string }} [opts] */
export function pgRestoreFromFile(dbUrl, dumpPath, opts = {}) {
  const root = opts.root ?? repoRootFromLanDir()
  const baseArgs = ['--clean', '--if-exists', '--no-owner', '--role=postgres', '-d', dbUrl]
  const container = findSupabaseDbContainer(root)

  if (container) {
    const innerUrl = dbUrlForDockerExec(dbUrl)
    const inContainer = `/tmp/acomopms-restore-${process.pid}.dump`
    dockerCopyIn(container, dumpPath, inContainer)
    const child = spawnSync(
      'docker',
      [
        'exec',
        '-i',
        container,
        'pg_restore',
        '--clean',
        '--if-exists',
        '--no-owner',
        '--role=postgres',
        '-d',
        innerUrl,
        inContainer,
      ],
      { stdio: 'inherit', env: process.env },
    )
    spawnSync('docker', ['exec', '-i', container, 'rm', '-f', inContainer], { stdio: 'ignore' })
    if (child.status !== 0) {
      throw new Error(`pg_restore (docker) saiu com código ${child.status ?? 'desconhecido'}`)
    }
    return { mode: 'docker', container }
  }

  if (commandExists('pg_restore')) {
    return runPgTool('pg_restore', [...baseArgs, dumpPath], { root })
  }

  throw new Error('pg_restore indisponível e container Supabase DB não encontrado.')
}

/** @param {string} dumpPath @param {{ root?: string }} [opts] */
export function pgRestoreList(dumpPath, opts = {}) {
  const root = opts.root ?? repoRootFromLanDir()
  const container = findSupabaseDbContainer(root)

  if (container) {
    const inContainer = `/tmp/acomopms-list-${process.pid}.dump`
    dockerCopyIn(container, dumpPath, inContainer)
    const r = spawnSync('docker', ['exec', '-i', container, 'pg_restore', '--list', inContainer], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    spawnSync('docker', ['exec', '-i', container, 'rm', '-f', inContainer], { stdio: 'ignore' })
    return { ok: r.status === 0, output: (r.stdout ?? '') + (r.stderr ?? ''), mode: 'docker' }
  }

  if (commandExists('pg_restore')) {
    const r = spawnSync('pg_restore', ['--list', dumpPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: r.status === 0, output: (r.stdout ?? '') + (r.stderr ?? ''), mode: 'host' }
  }

  return { ok: false, output: 'pg_restore/docker indisponível', mode: 'none' }
}
