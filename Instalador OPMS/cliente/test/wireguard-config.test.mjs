import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildWireGuardConf } from '../lib/overlay/wireguard-config.mjs'
import { validateConnectionJson } from '../lib/overlay/connection-json.mjs'

const example = join(dirname(fileURLToPath(import.meta.url)), '../../connection.json.example')

test('buildWireGuardConf a partir do exemplo', () => {
  const conn = validateConnectionJson(JSON.parse(readFileSync(example, 'utf8')))
  const conf = buildWireGuardConf(conn)
  assert.match(conf, /\[Interface\]/)
  assert.match(conf, /PrivateKey = CLIENT_PRIVATE_KEY_BASE64/)
  assert.match(conf, /Endpoint = 203.0.113.10:51820/)
})
