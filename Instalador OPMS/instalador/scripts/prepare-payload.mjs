#!/usr/bin/env node
/**
 * Monta resources/payload (Electron + app cliente) para o wizard copiar na instalação.
 */
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const instaladorRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoCliente = join(instaladorRoot, '..', 'cliente')
const payloadRoot = join(instaladorRoot, 'resources', 'payload')
const electronDist = join(instaladorRoot, 'node_modules', 'electron', 'dist')

const appFiles = ['electron-main.mjs', 'preload.cjs', 'package.json']

function copyClienteApp() {
  const dest = join(payloadRoot, 'app')
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  for (const f of appFiles) {
    cpSync(join(repoCliente, f), join(dest, f))
  }
  cpSync(join(repoCliente, 'lib'), join(dest, 'lib'), { recursive: true })
}

function copyElectronRuntime() {
  if (!existsSync(electronDist)) {
    throw new Error('Electron não instalado. Rode: npm install (em instalador/)')
  }
  const dest = join(payloadRoot, 'electron')
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  cpSync(electronDist, dest, { recursive: true })
}

copyClienteApp()
copyElectronRuntime()
console.log('[instalador] payload OK:', payloadRoot)
