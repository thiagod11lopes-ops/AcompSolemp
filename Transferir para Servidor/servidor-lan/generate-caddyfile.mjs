#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildCaddyfileContent } from './lib/generate-caddyfile-lan.mjs'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './lib/load-servidor-env.mjs'

const root = resolve(SERVIDOR_LAN_DIR, '../..')
const cfg = loadServidorEnv()
const distRoot = resolve(root, 'frontend/dist')
const caddyfile = buildCaddyfileContent(cfg, { distRoot })

const out = resolve(SERVIDOR_LAN_DIR, 'Caddyfile.generated')
writeFileSync(out, caddyfile, 'utf8')
console.log(`[servidor-lan] Caddyfile: ${out} (porta ${cfg.httpPort}, dist ${distRoot})`)
