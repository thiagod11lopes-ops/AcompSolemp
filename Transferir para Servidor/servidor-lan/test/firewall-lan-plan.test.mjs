import test from 'node:test'
import assert from 'node:assert/strict'
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
