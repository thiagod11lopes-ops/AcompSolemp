#!/usr/bin/env node
/**
 * Etapa 3 — confere se frontend/dist foi buildado para a URL LAN (via Caddy, mesma origem).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './lib/load-servidor-env.mjs'

const lanDir = SERVIDOR_LAN_DIR
const root = resolve(lanDir, '../..')
const dist = resolve(root, 'frontend/dist')
const cfg = loadServidorEnv(resolve(lanDir, 'servidor.env'))
const expected = cfg.publicOrigin.replace(/\/+$/, '')

if (!existsSync(join(dist, 'index.html'))) {
  console.error('frontend/dist/index.html ausente. Rode build-producao-lan.')
  process.exit(1)
}

const manifestPath = join(dist, 'lan-build.json')
if (existsSync(manifestPath)) {
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (m.publicOrigin !== expected) {
    console.error(`lan-build.json: ${m.publicOrigin} != esperado ${expected}`)
    process.exit(1)
  }
  console.log('OK lan-build.json:', m.publicOrigin)
}

const jsFiles = readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js'))
let foundOrigin = false
let found54321 = false
for (const f of jsFiles) {
  const text = readFileSync(join(dist, 'assets', f), 'utf8')
  if (text.includes(expected)) foundOrigin = true
  if (text.includes('127.0.0.1:54321') || text.includes('localhost:54321')) found54321 = true
}

if (!foundOrigin) {
  console.error(`Nenhum bundle JS contem a origem LAN esperada: ${expected}`)
  console.error('Refaca: build-producao-lan apos aplicar-auth-lan.')
  process.exit(1)
}

if (found54321) {
  console.warn('AVISO: bundle ainda referencia :54321 — API deve ir via Caddy na mesma origem.')
}

console.log(`OK: build LAN aponta para ${expected} (auth/rest via proxy /auth, /rest, …)`)
