import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildHttpAllowRulePlan,
  buildHttpAllowRulePlanFromEnv,
  FIREWALL_RULE_NAMES,
  parseFirewallScope,
  TAILNET_REMOTE_ADDRESS,
  TAILSCALE_INTERFACE_ALIAS,
} from '../lib/firewall-lan-plan.mjs'

test('parseFirewallScope: tailnet vs local e legado', () => {
  assert.equal(parseFirewallScope({ ACOMOPMS_FIREWALL_SCOPE: 'tailnet' }), 'tailnet')
  assert.equal(parseFirewallScope({ ACOMOPMS_FIREWALL_SCOPE: 'local' }), 'local')
  assert.equal(parseFirewallScope({}), 'local')
})

test('modo tailnet: interface Tailscale + remoto 100.64/10, sem perfil Public', () => {
  const plan = buildHttpAllowRulePlan({ firewallScope: 'tailnet', httpPort: 8080 })
  assert.equal(plan.mode, 'tailnet')
  assert.equal(plan.displayName, FIREWALL_RULE_NAMES.tailnetHttp)
  assert.equal(plan.interfaceAlias, TAILSCALE_INTERFACE_ALIAS, 'hint documental; PS1 usa adaptador detectado')
  assert.equal(plan.remoteAddress, TAILNET_REMOTE_ADDRESS)
  assert.equal(plan.localPort, 8080)
  assert.deepEqual(plan.profiles, ['Private'])
  assert.ok(plan.excludedProfiles.includes('Public'))
  assert.equal(plan.removeLegacyLanHttpRule, true)
})

test('modo local: perfil Private sem filtro de interface (legado 4B)', () => {
  const plan = buildHttpAllowRulePlan({ firewallScope: 'local', httpPort: 9090 })
  assert.equal(plan.mode, 'local')
  assert.equal(plan.displayName, FIREWALL_RULE_NAMES.lanHttp)
  assert.equal(plan.interfaceAlias, null)
  assert.equal(plan.remoteAddress, null)
  assert.equal(plan.localPort, 9090)
  assert.equal(plan.removeTailnetHttpRule, true)
})

test('buildHttpAllowRulePlanFromEnv lê porta e escopo', () => {
  const plan = buildHttpAllowRulePlanFromEnv(
    { ACOMOPMS_FIREWALL_SCOPE: 'tailnet', ACOMOPMS_HTTP_PORT: '8080' },
    8080,
  )
  assert.equal(plan.mode, 'tailnet')
  assert.equal(plan.localPort, 8080)
})

test('script tailnet nao passa AssociatedNetFirewallRule ao Set e nao apaga a regra antes de criar', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const source = readFileSync(join(here, '..', 'corrigir-acesso-lan-firewall.ps1'), 'utf8')
  assert.equal(source.includes('Set-NetFirewallInterfaceFilter -AssociatedNetFirewallRule'), false)
  assert.match(
    source,
    /Get-NetFirewallInterfaceFilter -AssociatedNetFirewallRule \$Rule -ErrorAction Stop/,
  )
  assert.match(source, /\$filters \| Set-NetFirewallInterfaceFilter -InterfaceAlias \$InterfaceAlias/)

  const start = source.indexOf('function New-TailnetHttpFirewallRule')
  const end = source.indexOf('function New-LanPrivateHttpFirewallRule')
  assert.ok(start >= 0 && end > start)
  const body = source.slice(start, end)
  const createAt = body.indexOf('New-NetFirewallRule')
  const removeAt = body.indexOf('Remove-FirewallRuleIfExists')
  const assertAt = body.indexOf('Assert-TailnetFirewallInterfaceFilter')
  assert.ok(createAt > 0)
  assert.ok(assertAt > createAt)
  assert.ok(removeAt > assertAt, 'a regra legada so sai depois da conferencia tailnet')
  assert.equal(body.includes('Remove-FirewallRuleIfExists -DisplayName $Plan.displayName'), false)
  assert.match(body, /-RemoteAddress \$remoteAddress/)
  assert.match(body, /-InterfaceAlias \$InterfaceAlias/)
  assert.match(body, /-Profile Private/)
})
