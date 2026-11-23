import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function source(name) {
  return readFileSync(join(root, name), 'utf8')
}

test('a rede de loopback publica o host só em 127.0.0.1 e não apaga volumes', () => {
  const helper = source('lib/ensure-supabase-loopback-network.mjs')
  assert.match(helper, /acomopms-supabase-loopback/)
  assert.match(helper, /com\.docker\.network\.bridge\.host_binding_ipv4/)
  assert.match(helper, /\$\{IPV4_OPTION\}=127\.0\.0\.1/)
  assert.match(helper, /PortBindingBehavior/)
  assert.match(helper, /local-only-port-binding/)
  assert.equal(helper.includes('volume rm'), false)
  assert.equal(helper.includes('--no-backup'), false)
  assert.equal(helper.includes('network rm'), false)
})

test('os arranques do Supabase usam a rede de loopback', () => {
  const powershell = [
    'start-servidor-lan.ps1',
    'preparar-servidor-lan.ps1',
    'aplicar-auth-lan.ps1',
  ]
  for (const file of powershell) {
    const text = source(file)
    assert.match(text, /supabase-loopback-network\.ps1/, file)
    assert.match(text, /--network-id/, file)
    assert.equal(text.includes('--no-backup'), false, file)
  }
  const helper = source('lib/supabase-loopback-network.ps1')
  assert.match(helper, /ensure-supabase-loopback-network\.mjs/)
  assert.equal(helper.includes('--no-backup'), false)

  const shell = ['start-servidor-lan.sh', 'aplicar-auth-lan.sh', 'aplicar-overlay-servidor.sh']
  for (const file of shell) {
    const text = source(file)
    assert.match(text, /ensure-supabase-loopback-network\.mjs/, file)
    assert.match(text, /--network-id/, file)
    assert.equal(text.includes('--no-backup'), false, file)
  }
})
