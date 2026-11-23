import test from 'node:test'
import assert from 'node:assert/strict'
import {
  collectAuthRedirectOrigins,
  collectSecondaryInternetRedirectOrigins,
  redirectSet,
} from '../lib/auth-redirects.mjs'

test('inclui overlay origin nos redirects', () => {
  const urls = collectAuthRedirectOrigins({
    publicOrigin: 'http://192.168.0.10:8080',
    httpPort: 8080,
    overlayOrigin: 'http://100.64.0.1:8080',
  })
  assert.ok(urls.some((u) => u.startsWith('http://100.64.0.1:8080/login')))
})

test('modo internet usa site_url canonico e redirecionamentos secundarios auto', () => {
  const urls = collectAuthRedirectOrigins({
    publicOrigin: 'http://desktop-78me07d.tail08f930.ts.net:8080',
    httpPort: 8080,
    accessMode: 'internet',
    envVars: { ACOMOPMS_SECONDARY_LAN_REDIRECTS: 'auto' },
    detectPhysicalLanIPv4: () => '192.168.0.44',
    detectTailscaleIPv4: () => '100.102.248.103',
  })

  assert.ok(urls.some((u) => u === 'http://desktop-78me07d.tail08f930.ts.net:8080/login'))
  assert.ok(urls.some((u) => u.startsWith('http://192.168.0.44:8080/login')))
  assert.ok(urls.some((u) => u.startsWith('http://100.102.248.103:8080/login')))
  assert.ok(urls.some((u) => u.startsWith('http://127.0.0.1:8080/login')))
  assert.ok(urls.includes('http://localhost:5173'))
})

test('modo internet com IPv4 Tailscale canonico nao duplica tailnet nos secundarios', () => {
  const urls = collectAuthRedirectOrigins({
    publicOrigin: 'http://100.102.248.103:8080',
    httpPort: 8080,
    accessMode: 'internet',
    secondaryLanRedirects: 'auto',
    detectPhysicalLanIPv4: () => '192.168.0.44',
    detectTailscaleIPv4: () => '100.102.248.103',
  })

  const secondary = collectSecondaryInternetRedirectOrigins({
    publicOrigin: 'http://100.102.248.103:8080',
    httpPort: 8080,
    detectPhysicalLanIPv4: () => '192.168.0.44',
    detectTailscaleIPv4: () => '100.102.248.103',
  })
  assert.deepEqual(secondary, ['http://192.168.0.44:8080'])
  assert.ok(urls.some((u) => u.startsWith('http://192.168.0.44:8080/login')))
})

test('secundarios auto omitem IP fisico quando indisponivel', () => {
  const origins = collectSecondaryInternetRedirectOrigins({
    publicOrigin: 'http://host.example.ts.net:8080',
    httpPort: 8080,
    detectPhysicalLanIPv4: () => null,
    detectTailscaleIPv4: () => '100.64.0.8',
  })
  assert.deepEqual(origins, ['http://100.64.0.8:8080'])
})

test('secundarios auto nao tratam tailscale como LAN fisica', () => {
  const origins = collectSecondaryInternetRedirectOrigins({
    publicOrigin: 'http://pc.tail123456.ts.net:8080',
    httpPort: 8080,
    detectPhysicalLanIPv4: () => '100.64.0.99',
    detectTailscaleIPv4: () => '100.64.0.8',
  })
  assert.ok(!origins.some((o) => o.includes('100.64.0.99')))
  assert.ok(origins.includes('http://100.64.0.8:8080'))
})

test('modo local preserva redirects sem secundarios tailnet', () => {
  const urls = collectAuthRedirectOrigins({
    publicOrigin: 'http://192.168.0.10:8080',
    httpPort: 8080,
    accessMode: 'local',
    envVars: { ACOMOPMS_SECONDARY_LAN_REDIRECTS: 'auto' },
    detectPhysicalLanIPv4: () => '192.168.0.99',
    detectTailscaleIPv4: () => '100.64.0.8',
  })

  assert.ok(urls.some((u) => u.startsWith('http://192.168.0.10:8080/login')))
  assert.ok(!urls.some((u) => u.startsWith('http://100.64.0.8:8080/')))
  assert.ok(!urls.some((u) => u.startsWith('http://192.168.0.99:8080/')))
  assert.deepEqual(redirectSet('http://192.168.0.10:8080').every((e) => urls.includes(e)), true)
})
