import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applySupabaseAuthConfigToToml,
  buildSupabaseAuthConfigFromServidorCfg,
  readSupabaseAuthConfigFromToml,
  assertAllowedRedirectEntry,
} from '../lib/configure-auth-lan.mjs'

const SAMPLE_TOML = `
[auth]
site_url = "http://127.0.0.1:54321"
additional_redirect_urls = ["http://127.0.0.1:3000"]
`.trim()

function internetTailscaleCfg(overrides = {}) {
  return {
    publicOrigin: 'http://desktop-78me07d.tail08f930.ts.net:8080',
    httpPort: 8080,
    accessMode: 'internet',
    overlayEnabled: false,
    overlayOrigin: null,
    envVars: { ACOMOPMS_SECONDARY_LAN_REDIRECTS: 'auto' },
    detectPhysicalLanIPv4: () => '192.168.0.44',
    detectTailscaleIPv4: () => '100.102.248.103',
    ...overrides,
  }
}

test('modo internet: site_url canonico Tailscale e redirects de collectAuthRedirectOrigins', () => {
  const patch = buildSupabaseAuthConfigFromServidorCfg(internetTailscaleCfg())
  assert.equal(patch.siteUrl, 'http://desktop-78me07d.tail08f930.ts.net:8080')
  assert.ok(patch.additionalRedirectUrls.includes('http://desktop-78me07d.tail08f930.ts.net:8080/login'))
  assert.ok(patch.additionalRedirectUrls.some((u) => u.startsWith('http://192.168.0.44:8080/login')))
  assert.ok(patch.additionalRedirectUrls.some((u) => u.startsWith('http://100.102.248.103:8080/login')))
  assert.ok(patch.additionalRedirectUrls.includes('http://127.0.0.1:8080/login'))
  assert.ok(!patch.additionalRedirectUrls.some((u) => u.includes('evil.example')))
})

test('modo local legado: site_url LAN e sem redirects tailnet secundarios', () => {
  const patch = buildSupabaseAuthConfigFromServidorCfg({
    publicOrigin: 'http://192.168.0.10:8080',
    httpPort: 8080,
    accessMode: 'local',
    envVars: { ACOMOPMS_SECONDARY_LAN_REDIRECTS: 'auto' },
    detectPhysicalLanIPv4: () => '100.64.0.8',
    detectTailscaleIPv4: () => '100.64.0.9',
  })
  assert.equal(patch.siteUrl, 'http://192.168.0.10:8080')
  assert.ok(!patch.additionalRedirectUrls.some((u) => u.includes('100.64.0.8')))
  assert.ok(!patch.additionalRedirectUrls.some((u) => u.includes('100.64.0.9')))
})

test('applySupabaseAuthConfigToToml persiste site_url e lista (mock, sem Supabase)', () => {
  const patch = buildSupabaseAuthConfigFromServidorCfg(internetTailscaleCfg())
  const updated = applySupabaseAuthConfigToToml(SAMPLE_TOML, patch)
  const readBack = readSupabaseAuthConfigFromToml(updated)
  assert.equal(readBack.siteUrl, patch.siteUrl)
  assert.deepEqual(readBack.additionalRedirectUrls, patch.additionalRedirectUrls)
})

test('rejeita redirect com host arbitrario', () => {
  assert.throws(
    () => assertAllowedRedirectEntry('http://evil.example:8080/login'),
    /host nao permitido/i,
  )
})
