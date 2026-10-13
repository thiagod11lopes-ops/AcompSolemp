import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertAnonKeySafeForFrontendBundle,
  assertPublicOriginForAccessMode,
  buildFrontendProductionEnvContent,
} from '../lib/write-frontend-env-lan.mjs'

const MOCK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon.mock'

test('modo internet MagicDNS: VITE_SUPABASE_URL usa origem canonica Tailscale', () => {
  const cfg = {
    publicOrigin: 'http://desktop-78me07d.tail08f930.ts.net:8080',
    accessMode: 'internet',
  }
  const body = buildFrontendProductionEnvContent(cfg, MOCK_ANON)
  assert.ok(body.includes('VITE_SUPABASE_URL=http://desktop-78me07d.tail08f930.ts.net:8080'))
  assert.ok(body.includes('VITE_DATA_SOURCE=supabase'))
  assert.ok(body.includes('VITE_SUPABASE_ANON_KEY='))
  assert.ok(!body.includes('SERVICE_ROLE'))
})

test('modo internet IPv4 Tailscale', () => {
  const cfg = {
    publicOrigin: 'http://100.102.248.103:8080',
    accessMode: 'internet',
  }
  const body = buildFrontendProductionEnvContent(cfg, MOCK_ANON)
  assert.ok(body.includes('VITE_SUPABASE_URL=http://100.102.248.103:8080'))
})

test('modo internet rejeita IP LAN fisico como origem', () => {
  assert.throws(
    () =>
      assertPublicOriginForAccessMode(
        { accessMode: 'internet' },
        'http://192.168.0.10:8080',
      ),
    /Tailscale/i,
  )
})

test('modo local preserva origem LAN', () => {
  const cfg = {
    publicOrigin: 'http://192.168.0.44:8080',
    accessMode: 'local',
  }
  const body = buildFrontendProductionEnvContent(cfg, MOCK_ANON)
  assert.ok(body.includes('VITE_SUPABASE_URL=http://192.168.0.44:8080'))
})

test('modo legado sem accessMode aceita origem LAN', () => {
  const cfg = { publicOrigin: 'http://192.168.1.5:8080' }
  const body = buildFrontendProductionEnvContent(cfg, MOCK_ANON)
  assert.ok(body.includes('VITE_SUPABASE_URL=http://192.168.1.5:8080'))
})

test('nao permite service_role no bundle frontend', () => {
  assert.throws(
    () => assertAnonKeySafeForFrontendBundle('service_role_secret'),
    /SERVICE_ROLE/i,
  )
})
