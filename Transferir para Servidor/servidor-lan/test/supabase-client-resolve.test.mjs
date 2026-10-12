import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureServidorLanNodeModules } from '../lib/ensure-test-deps.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = join(here, '..', 'teste-servidor-lan.mjs')

test('o teste LAN importa supabase-js so depois de ligar o node_modules do frontend', () => {
  const source = readFileSync(scriptPath, 'utf8')
  assert.equal(source.includes("from '@supabase/supabase-js'"), false)
  const ensureAt = source.indexOf('ensureServidorLanNodeModules()')
  const importAt = source.indexOf("await import('@supabase/supabase-js')")
  assert.ok(ensureAt > 0)
  assert.ok(importAt > ensureAt)
})

test('resolve @supabase/supabase-js 2.110.2 a partir de servidor-lan', async () => {
  const link = ensureServidorLanNodeModules()
  const require = createRequire(join(here, '..', 'teste-servidor-lan.mjs'))
  const pkgPath = require.resolve('@supabase/supabase-js/package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  assert.equal(pkg.version, '2.110.2')
  const mod = await import('@supabase/supabase-js')
  assert.equal(typeof mod.createClient, 'function')
  assert.ok(pkgPath.replaceAll('\\', '/').includes('/frontend/node_modules/@supabase/supabase-js/'))
  assert.ok(link.replaceAll('\\', '/').endsWith('/servidor-lan/node_modules'))
})
