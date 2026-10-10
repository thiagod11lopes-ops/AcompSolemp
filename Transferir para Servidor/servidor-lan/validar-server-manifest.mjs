#!/usr/bin/env node
/**
 * Etapa 7 — validação básica de server-manifest.json (paths + referências).
 * Schema JSON completo: Etapa 8 (ajv + schemas/server-manifest.schema.json).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const manifestPath = resolve(root, 'server-manifest.json')

function fail(msg) {
  console.error(`❌ ${msg}`)
  process.exitCode = 1
}

function ok(msg) {
  console.log(`✅ ${msg}`)
}

let manifest
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
} catch (e) {
  fail(`server-manifest.json inválido: ${e.message}`)
  process.exit(1)
}

ok(`manifestVersion ${manifest.manifestVersion}`)

const scripts = manifest.scripts?.items ?? []
const byId = new Map(scripts.map((s) => [s.id, s]))

for (const s of scripts) {
  const p = resolve(root, s.path)
  if (!existsSync(p)) fail(`script ${s.id}: arquivo ausente ${s.path}`)
  else ok(`script ${s.id}`)
}

const refs = new Set()
for (const phase of manifest.installPlan?.phases ?? []) {
  if (phase.scriptId) refs.add(phase.scriptId)
  if (phase.scriptIdByPlatform) {
    for (const id of Object.values(phase.scriptIdByPlatform)) refs.add(id)
  }
}
for (const t of manifest.validation?.postInstall?.tests ?? []) {
  if (t.scriptId) refs.add(t.scriptId)
}

for (const id of refs) {
  if (!byId.has(id)) fail(`scriptId referenciado sem catálogo: ${id}`)
}

const conn = manifest.clientConnection
if (conn?.runtimeDescriptor?.generatorScriptId) {
  const gid = conn.runtimeDescriptor.generatorScriptId
  if (!byId.has(gid)) fail(`clientConnection.generatorScriptId ausente: ${gid}`)
  else ok(`clientConnection → ${gid}`)
}

if (manifest.overlay?.configuration?.environmentKeys?.length) {
  ok(`overlay env keys: ${manifest.overlay.configuration.environmentKeys.length}`)
}

if (process.exitCode) {
  console.error('\nCorrija server-manifest.json antes de publicar.')
} else {
  console.log('\nManifesto OK (validação estrutural Etapa 7).')
}
