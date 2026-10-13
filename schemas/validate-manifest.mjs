#!/usr/bin/env node
/**
 * Valida server-manifest.json contra schemas/server-manifest.schema.json (AJV draft 2020-12).
 */
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const schemasDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(schemasDir, '..')
const schemaPath = resolve(schemasDir, 'server-manifest.schema.json')
const manifestPath = resolve(root, 'server-manifest.json')

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
const data = JSON.parse(readFileSync(manifestPath, 'utf8'))

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateSchema: false,
})
addFormats(ajv)

const validate = ajv.compile(schema)
if (!validate(data)) {
  console.error('❌ server-manifest.json inválido contra JSON Schema:')
  for (const err of validate.errors ?? []) {
    console.error(`  ${err.instancePath || '/'} ${err.message}`)
    if (err.params && Object.keys(err.params).length) {
      console.error(`    params: ${JSON.stringify(err.params)}`)
    }
  }
  process.exit(1)
}

console.log(`✅ server-manifest.json válido (schema ${schema.$id}, manifestVersion ${data.manifestVersion})`)
