import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseSupabaseInternalPortsFromConfig,
  getInternalSupabaseTcpPorts,
} from '../lib/supabase-internal-ports.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const configPath = resolve(repoRoot, 'supabase/config.toml')

test('lê portas principais do config.toml do repo', () => {
  const ports = parseSupabaseInternalPortsFromConfig(configPath)
  assert.ok(ports.includes(54321))
  assert.ok(ports.includes(54322))
  assert.ok(ports.includes(54323))
})

test('getInternalSupabaseTcpPorts inclui defaults do manifesto', () => {
  const ports = getInternalSupabaseTcpPorts(configPath)
  assert.ok(ports.includes(54320))
  assert.ok(ports.includes(8083))
})
