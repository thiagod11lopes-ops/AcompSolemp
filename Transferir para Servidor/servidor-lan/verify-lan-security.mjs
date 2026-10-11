#!/usr/bin/env node
/** Alias de manifesto (script id verify-lan-security) → verificar-seguranca-lan.mjs */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dir = path.dirname(fileURLToPath(import.meta.url))
const child = spawnSync(
  process.execPath,
  [path.join(dir, 'verificar-seguranca-lan.mjs'), ...process.argv.slice(2)],
  { stdio: 'inherit' },
)
process.exit(child.status ?? 1)
