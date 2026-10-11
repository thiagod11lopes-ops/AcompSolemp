import test from 'node:test'
import assert from 'node:assert/strict'
import {
  describeExpectedSecurityPolicy,
  isExpectedPublicHostForInternet,
  resolveSecurityProbeHosts,
  evaluateInternalPortProbes,
  probeTcp,
} from '../lib/lan-security-check.mjs'

test('isExpectedPublicHostForInternet reconhece MagicDNS e 100.x', () => {
  assert.equal(isExpectedPublicHostForInternet('desktop-78me07d.tail08f930.ts.net'), true)
  assert.equal(isExpectedPublicHostForInternet('100.102.248.103'), true)
  assert.equal(isExpectedPublicHostForInternet('192.168.0.10'), false)
})

test('modo internet: hosts de probe canonical + LAN fisica secundaria', () => {
  const hosts = resolveSecurityProbeHosts(
    {
      accessMode: 'internet',
      lanHost: 'desktop-78me07d.tail08f930.ts.net',
      envVars: { ACOMOPMS_ACCESS_MODE: 'internet' },
    },
    { physicalLanIPv4: '192.168.0.44' },
  )
  assert.deepEqual(
    hosts.map((h) => h.role),
    ['canonical-tailscale', 'physical-lan-secondary'],
  )
  assert.equal(hosts[0].host, 'desktop-78me07d.tail08f930.ts.net')
  assert.equal(hosts[1].host, '192.168.0.44')
})

test('modo internet IPv4 Tailscale nao duplica fisico tailscale como LAN', () => {
  const hosts = resolveSecurityProbeHosts(
    {
      accessMode: 'internet',
      lanHost: '100.102.248.103',
      envVars: {},
    },
    { physicalLanIPv4: '100.64.0.99' },
  )
  assert.equal(hosts.length, 1)
  assert.equal(hosts[0].host, '100.102.248.103')
})

test('modo internet rejeita IPv4 LAN fisico como host publico', () => {
  assert.throws(
    () =>
      resolveSecurityProbeHosts({
        accessMode: 'internet',
        lanHost: '192.168.0.10',
        envVars: {},
      }),
    /MagicDNS|IPv4 Tailscale/,
  )
})

test('modo local legado: probe no lanHost', () => {
  const hosts = resolveSecurityProbeHosts({
    accessMode: 'local',
    lanHost: '192.168.0.10',
    envVars: {},
  })
  assert.deepEqual(hosts, [{ host: '192.168.0.10', role: 'lan' }])
})

test('politica esperada tailnet inclui interface e CIDR', () => {
  const policy = describeExpectedSecurityPolicy({
    ACOMOPMS_FIREWALL_SCOPE: 'tailnet',
    ACOMOPMS_HTTP_PORT: '8080',
  })
  assert.equal(policy.firewallScope, 'tailnet')
  assert.equal(policy.httpAllowRule.mode, 'tailnet')
  assert.equal(policy.httpAllowRule.interfaceAlias, 'Tailscale')
  assert.equal(policy.httpAllowRule.remoteAddress, '100.64.0.0/255.192.0.0')
  assert.ok(policy.httpAllowRule.excludedProfiles.includes('Public'))
  assert.match(policy.managerAdminApi, /127\.0\.0\.1:47831/)
})

test('evaluateInternalPortProbes falha se porta interna reachable', () => {
  const r = evaluateInternalPortProbes([
    { host: '100.102.248.103', port: 54321, reachable: false },
    { host: '100.102.248.103', port: 54322, reachable: true },
  ])
  assert.equal(r.ok, false)
  assert.equal(r.failures.length, 1)
})

test('probeTcp mock: localhost closed port', async () => {
  const open = await probeTcp('127.0.0.1', 1, 500)
  assert.equal(open, false)
})
