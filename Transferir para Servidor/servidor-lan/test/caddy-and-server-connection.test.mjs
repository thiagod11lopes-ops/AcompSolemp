import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildServerConnectionDescriptor } from '../lib/build-server-connection.mjs'
import {
  assertSupabaseInternalIsLoopback,
  buildCaddyfileContent,
} from '../lib/generate-caddyfile-lan.mjs'

function writeEnv(dir, lines) {
  const file = path.join(dir, 'servidor.env')
  fs.writeFileSync(file, `${lines.join('\n')}\n`, 'utf8')
  return file
}

test('Caddy: proxy Supabase apenas via loopback', () => {
  assert.doesNotThrow(() => assertSupabaseInternalIsLoopback('http://127.0.0.1:54321'))
  assert.throws(
    () => assertSupabaseInternalIsLoopback('http://192.168.0.1:54321'),
    /loopback/i,
  )
  const body = buildCaddyfileContent(
    { httpPort: 8080, supabaseInternal: 'http://127.0.0.1:54321' },
    { distRoot: 'C:/app/frontend/dist' },
  )
  assert.ok(body.includes('bind 0.0.0.0'))
  assert.ok(body.includes('reverse_proxy http://127.0.0.1:54321'))
  assert.ok(body.includes(':8080'))
  assert.ok(!body.includes('54322'))
})

test('server-connection modo internet MagicDNS', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acom-conn-dns-'))
  const envPath = writeEnv(dir, [
    'ACOMOPMS_ACCESS_MODE=internet',
    'ACOMOPMS_LAN_HOST=desktop-78me07d.tail08f930.ts.net',
    'ACOMOPMS_HTTP_PORT=8080',
    'ACOMOPMS_OVERLAY_ENABLED=false',
  ])
  const doc = buildServerConnectionDescriptor(envPath)
  assert.equal(doc.accessMode, 'internet')
  assert.equal(doc.lan.host, 'desktop-78me07d.tail08f930.ts.net')
  assert.equal(doc.lan.origin, 'http://desktop-78me07d.tail08f930.ts.net:8080')
  assert.equal(doc.lan.loginUrl, 'http://desktop-78me07d.tail08f930.ts.net:8080/login')
  assert.equal(doc.lan.supabaseUrl, doc.lan.origin)
  assert.equal(doc.client.recommendedStartUrl, doc.lan.loginUrl)
  assert.equal(doc.lan.publicAccessMode, 'internet')
})

test('server-connection modo internet IPv4 Tailscale', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acom-conn-ip-'))
  const envPath = writeEnv(dir, [
    'ACOMOPMS_ACCESS_MODE=internet',
    'ACOMOPMS_LAN_HOST=100.102.248.103',
    'ACOMOPMS_HTTP_PORT=8080',
  ])
  const doc = buildServerConnectionDescriptor(envPath)
  assert.equal(doc.lan.origin, 'http://100.102.248.103:8080')
  assert.equal(doc.lan.loginUrl, 'http://100.102.248.103:8080/login')
})

test('server-connection modo local', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acom-conn-local-'))
  const envPath = writeEnv(dir, [
    'ACOMOPMS_ACCESS_MODE=local',
    'ACOMOPMS_LAN_HOST=192.168.0.55',
    'ACOMOPMS_HTTP_PORT=8080',
  ])
  const doc = buildServerConnectionDescriptor(envPath)
  assert.equal(doc.accessMode, 'lan')
  assert.equal(doc.lan.publicAccessMode, 'local')
  assert.equal(doc.lan.origin, 'http://192.168.0.55:8080')
})
