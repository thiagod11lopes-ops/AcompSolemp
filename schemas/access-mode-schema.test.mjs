import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const schemasDir = dirname(fileURLToPath(import.meta.url))
const schema = JSON.parse(readFileSync(resolve(schemasDir, 'server-manifest.schema.json'), 'utf8'))
const manifest = JSON.parse(readFileSync(resolve(schemasDir, '../server-manifest.json'), 'utf8'))

const ALLOWED_MODE_IDS = ['lan', 'internet', 'overlay', 'localhost', 'custom']

function compile() {
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateSchema: false })
  addFormats(ajv)
  return ajv.compile(schema)
}

test('schema aceita o modo internet e o manifesto real', () => {
  assert.deepEqual(schema.$defs.networkAccessMode.properties.id.enum, ALLOWED_MODE_IDS)

  const validate = compile()
  assert.equal(validate(manifest), true, JSON.stringify(validate.errors))

  const internet = manifest.network.accessModes.find((mode) => mode.id === 'internet')
  assert.equal(internet.status, 'active')

  const overlay = manifest.network.accessModes.find((mode) => mode.id === 'overlay')
  assert.equal(overlay.status, 'planned')
})

test('ids de modo fora do enum continuam rejeitados', () => {
  const validate = compile()
  const copy = structuredClone(manifest)
  copy.network.accessModes[1].id = 'tailnet'
  assert.equal(validate(copy), false)
  const error = (validate.errors ?? []).find((item) => item.instancePath === '/network/accessModes/1/id')
  assert.ok(error)
  assert.match(error.message, /equal to one of the allowed values/)
})

test('lan, overlay, localhost e custom continuam aceitos', () => {
  const validate = compile()
  for (const id of ['lan', 'overlay', 'localhost', 'custom']) {
    const copy = structuredClone(manifest)
    copy.network.accessModes = [{ id, status: 'active', description: 'teste' }]
    assert.equal(validate(copy), true, `${id} ${JSON.stringify(validate.errors)}`)
  }
})
