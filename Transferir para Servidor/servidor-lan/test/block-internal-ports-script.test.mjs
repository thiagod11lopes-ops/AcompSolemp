import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'aplicar-seguranca-lan-firewall.ps1'),
  'utf8',
)

test('LocalPort nao e uma string unica separada por virgula', () => {
  assert.equal(source.includes("-join ','"), false)
  assert.match(source, /-LocalPort \$item\.LocalPort/)
  assert.match(source, /\$localPort = \[string\]\$port/)
  assert.match(source, /throw "LocalPort agregado nao e aceito pelo Windows PowerShell 5\.1/)
})

test('8080 fica de fora e cada porta tem a propria regra', () => {
  assert.match(source, /if \(\$port -eq \$HttpPort -or \$port -eq 8080\)/)
  assert.match(source, /AcompOPMS - Bloquear Supabase na LAN \(TCP \$port\)/)
  assert.match(source, /-RemoteAddress LocalSubnet/)
  assert.match(source, /-Profile Private/)
  assert.match(source, /-Action Block/)
})

test('a regra legada so sai depois da conferencia e falha parcial encerra o script', () => {
  const failAt = source.indexOf('Sucesso parcial nao e sucesso')
  const exitAt = source.indexOf('exit 1')
  const removeAt = source.indexOf('Remove-NetFirewallRule -Name $legacyRule.Name')
  const successAt = source.indexOf('Regras de bloqueio conferidas')
  assert.ok(failAt > 0 && exitAt > failAt)
  assert.ok(removeAt > exitAt)
  assert.ok(successAt > removeAt)
  assert.equal(source.includes('Remove-NetFirewallRule -DisplayName $RuleBlockName'), false)
  assert.equal(source.includes('Remove-NetFirewallRule -DisplayName $LegacyRuleName'), false)
})
