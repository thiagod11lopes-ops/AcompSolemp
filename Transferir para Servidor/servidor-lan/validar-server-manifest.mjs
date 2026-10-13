#!/usr/bin/env node
/**
 * Valida server-manifest.json: JSON Schema (Etapa 8) + paths/referências (Etapa 7).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const manifestPath = resolve(root, 'server-manifest.json')
const ajvScript = resolve(root, 'schemas/validate-manifest.mjs')

function fail(msg) {
  console.error(`❌ ${msg}`)
  process.exitCode = 1
}

function ok(msg) {
  console.log(`✅ ${msg}`)
}

console.log('==> JSON Schema (AJV)')
if (!existsSync(ajvScript)) {
  fail(`schemas/validate-manifest.mjs ausente — rode Etapa 8`)
} else {
  const r = spawnSync(process.execPath, [ajvScript], { stdio: 'inherit', cwd: root })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

console.log('\n==> Referências e arquivos')

let manifest
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
} catch (e) {
  fail(`server-manifest.json inválido: ${e.message}`)
  process.exit(1)
}

ok(`manifestVersion ${manifest.manifestVersion}`)

if (manifest.$schema && !existsSync(resolve(root, manifest.$schema.replace(/^\.\//, '')))) {
  fail(`$schema aponta para arquivo ausente: ${manifest.$schema}`)
}

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
if (manifest.validation?.manifestValidationScriptId) {
  refs.add(manifest.validation.manifestValidationScriptId)
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
  console.log('\nManifesto OK (schema + estrutural).')
}
