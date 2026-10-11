import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  loadServidorEnv,
  parseAccessMode,
  resolveConfiguredLanHost,
} from '../lib/load-servidor-env.mjs'

function writeEnvFile(dir, lines) {
  const file = path.join(dir, 'servidor.env')
  fs.writeFileSync(file, `${lines.join('\n')}\n`, 'utf8')
  return file
}

test('modo internet com MagicDNS usa host canonico nas URLs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acom-env-dns-'))
  const envPath = writeEnvFile(dir, [
    'ACOMOPMS_ACCESS_MODE=internet',
    'ACOMOPMS_LAN_HOST=desktop-78me07d.tail08f930.ts.net',
    'ACOMOPMS_HTTP_PORT=8080',
  ])
  const cfg = loadServidorEnv(envPath)
  assert.equal(cfg.lanHost, 'desktop-78me07d.tail08f930.ts.net')
  assert.equal(cfg.publicOrigin, 'http://desktop-78me07d.tail08f930.ts.net:8080')
  assert.equal(cfg.supabasePublicUrl, cfg.publicOrigin)
  assert.equal(cfg.loginUrl, 'http://desktop-78me07d.tail08f930.ts.net:8080/login')
  assert.equal(parseAccessMode(cfg.envVars), 'internet')
})

test('modo internet com IPv4 Tailscale', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acom-env-ip-'))
  const envPath = writeEnvFile(dir, [
    'ACOMOPMS_ACCESS_MODE=internet',
    'ACOMOPMS_LAN_HOST=100.102.248.103',
    'ACOMOPMS_HTTP_PORT=9090',
  ])
  const cfg = loadServidorEnv(envPath)
  assert.equal(cfg.lanHost, '100.102.248.103')
  assert.equal(cfg.loginUrl, 'http://100.102.248.103:9090/login')
})

test('modo local auto continua compativel (detectLanHost)', () => {
  const resolved = resolveConfiguredLanHost({
    ACOMOPMS_ACCESS_MODE: 'local',
    ACOMOPMS_LAN_HOST: 'auto',
  })
  assert.equal(resolved.ok, true)
  assert.equal('useDetect' in resolved && resolved.useDetect, true)
})

test('modo local com IPv4 fixo preservado', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acom-env-local-'))
  const envPath = writeEnvFile(dir, [
    'ACOMOPMS_ACCESS_MODE=local',
    'ACOMOPMS_LAN_HOST=192.168.0.44',
    'ACOMOPMS_HTTP_PORT=8080',
  ])
  const cfg = loadServidorEnv(envPath)
  assert.equal(cfg.lanHost, '192.168.0.44')
  assert.equal(cfg.publicOrigin, 'http://192.168.0.44:8080')
})

test('modo internet rejeita hostname invalido', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acom-env-bad-'))
  const envPath = writeEnvFile(dir, [
    'ACOMOPMS_ACCESS_MODE=internet',
    'ACOMOPMS_LAN_HOST=192.168.0.10',
  ])
  assert.throws(() => loadServidorEnv(envPath), /Modo internet/)
})
