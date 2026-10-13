#!/usr/bin/env node
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildServerConnectionDescriptor } from './lib/build-server-connection.mjs'
import { SERVIDOR_LAN_DIR } from './lib/load-servidor-env.mjs'

const envPath = resolve(SERVIDOR_LAN_DIR, 'servidor.env')
const root = resolve(SERVIDOR_LAN_DIR, '../..')
const dist = resolve(root, 'frontend/dist')
const body = buildServerConnectionDescriptor(envPath)
const json = `${JSON.stringify(body, null, 2)}\n`

writeFileSync(resolve(SERVIDOR_LAN_DIR, 'server-connection.generated.json'), json, 'utf8')

if (existsSync(dist)) {
  writeFileSync(resolve(dist, 'server-connection.json'), json, 'utf8')
}

console.log('[servidor-lan] server-connection.json')
console.log(`  LAN login: ${body.lan.loginUrl}`)
if (body.overlay.enabled) {
  console.log(`  Overlay login: ${body.overlay.loginUrl ?? '(defina ACOMOPMS_OVERLAY_HOST)'}`)
}
