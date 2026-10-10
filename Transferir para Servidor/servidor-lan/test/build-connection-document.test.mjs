import test from 'node:test'
import assert from 'node:assert/strict'
import { buildConnectionDocument } from '../lib/overlay/build-connection-document.mjs'

test('buildConnectionDocument schema e loginUrl', () => {
  const doc = buildConnectionDocument({
    clientPrivateKey: 'c-priv',
    clientAddress: '100.64.0.2/32',
    serverPublicKey: 's-pub',
    publicEndpoint: 'udp://203.0.113.10:51820',
    serverOverlayHost: '100.64.0.1',
    httpPort: 8080,
    clientName: 'test',
  })
  assert.equal(doc.schema, 'acomopms-connection/1')
  assert.equal(doc.server.loginUrl, 'http://100.64.0.1:8080/login')
  assert.equal(doc.overlay.wireguard.peer.endpoint, '203.0.113.10:51820')
})
