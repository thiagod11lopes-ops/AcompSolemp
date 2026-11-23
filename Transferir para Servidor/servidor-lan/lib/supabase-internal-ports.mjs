import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

/** Portas Supabase locais que não devem ser acessíveis na LAN (alinhado a server-manifest.json). */
export const DEFAULT_INTERNAL_TCP_PORTS = [
  54320, 54321, 54322, 54323, 54324, 54327, 54329, 8083,
]

const PORT_SECTIONS = new Set([
  'api',
  'db',
  'studio',
  'db.pooler',
  'analytics',
  'inbucket',
  'local_smtp',
])

/**
 * Lê portas TCP relevantes de supabase/config.toml (seções conhecidas).
 * @param {string} [configPath]
 * @returns {number[]}
 */
export function parseSupabaseInternalPortsFromConfig(
  configPath = resolve(repoRoot, 'supabase/config.toml'),
) {
  if (!existsSync(configPath)) {
    return [...DEFAULT_INTERNAL_TCP_PORTS]
  }
  const text = readFileSync(configPath, 'utf8')
  const ports = new Set()
  let section = ''

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    const sec = trimmed.match(/^\[([^\]]+)\]$/)
    if (sec) {
      section = sec[1]
      continue
    }
    const shadow = trimmed.match(/^shadow_port\s*=\s*(\d+)/)
    if (shadow && section === 'db') {
      ports.add(Number.parseInt(shadow[1], 10))
      continue
    }
    const inspector = trimmed.match(/^inspector_port\s*=\s*(\d+)/)
    if (inspector) {
      ports.add(Number.parseInt(inspector[1], 10))
      continue
    }
    const m = trimmed.match(/^port\s*=\s*(\d+)\s*(?:#.*)?$/)
    if (!m) continue
    if (!PORT_SECTIONS.has(section)) continue
    ports.add(Number.parseInt(m[1], 10))
  }

  if (ports.size === 0) {
    return [...DEFAULT_INTERNAL_TCP_PORTS]
  }
  return [...ports].sort((a, b) => a - b)
}

/** @param {string} [configPath] */
export function getInternalSupabaseTcpPorts(configPath) {
  const parsed = parseSupabaseInternalPortsFromConfig(configPath)
  const merged = new Set([...DEFAULT_INTERNAL_TCP_PORTS, ...parsed])
  return [...merged].sort((a, b) => a - b)
}

export function repoRootPath() {
  return repoRoot
}
