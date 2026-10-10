#!/usr/bin/env node
import { readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const lanDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const testDir = join(lanDir, 'test')
if (!existsSync(testDir)) {
  console.error('Pasta test/ ausente')
  process.exit(1)
}
const files = readdirSync(testDir)
  .filter((f) => f.endsWith('.test.mjs'))
  .map((f) => join(testDir, f))
if (!files.length) {
  console.error('Nenhum *.test.mjs em test/')
  process.exit(1)
}
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' })
process.exit(r.status ?? 1)
