import test from 'node:test'
import assert from 'node:assert/strict'
import { collectAuthRedirectOrigins } from '../lib/auth-redirects.mjs'

test('inclui overlay origin nos redirects', () => {
  const urls = collectAuthRedirectOrigins({
    publicOrigin: 'http://192.168.0.10:8080',
    httpPort: 8080,
    overlayOrigin: 'http://100.64.0.1:8080',
  })
  assert.ok(urls.some((u) => u.startsWith('http://100.64.0.1:8080/login')))
})
