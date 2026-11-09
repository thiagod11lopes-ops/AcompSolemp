#!/usr/bin/env node
/**
 * Desenvolvimento: npm run start:url -- https://thiagod11lopes-ops.github.io/AcompSolemp/
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const url = process.argv[2] || 'https://thiagod11lopes-ops.github.io/AcompSolemp/'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const electron = path.join(root, 'node_modules', 'electron', 'cli.js')

const child = spawn(process.execPath, [electron, '.'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ACOMOPMS_DESKTOP_URL: url },
})
child.on('exit', (code) => process.exit(code ?? 0))
