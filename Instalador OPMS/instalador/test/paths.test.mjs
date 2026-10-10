import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultInstallDir, clientExeName } from '../src/paths.mjs'

test('defaultInstallDir contém AcompOPMS', () => {
  assert.match(defaultInstallDir(), /AcompOPMS/)
})

test('clientExeName', () => {
  const name = clientExeName()
  assert.ok(name === 'AcompOPMS.exe' || name === 'AcompOPMS')
})
