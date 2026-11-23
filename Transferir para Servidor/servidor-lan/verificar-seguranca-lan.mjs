#!/usr/bin/env node
/**
 * Etapa 15 / verify-lan-security (manifesto) — portas internas Supabase inacessíveis no host público.
 * Uso: node verificar-seguranca-lan.mjs [--json] [--skip-probe]
 */
import { pathToFileURL } from 'node:url'
import { loadServidorEnv } from './lib/load-servidor-env.mjs'
import { getInternalSupabaseTcpPorts } from './lib/supabase-internal-ports.mjs'
import {
  describeExpectedSecurityPolicy,
  evaluateInternalPortProbes,
  isLoopbackLanHost,
  probeTcp,
  resolveSecurityProbeHosts,
} from './lib/lan-security-check.mjs'

const args = new Set(process.argv.slice(2))
const jsonOut = args.has('--json')
const skipProbe = args.has('--skip-probe')

async function main() {
  const env = loadServidorEnv()
  const ports = getInternalSupabaseTcpPorts()
  const accessMode = env.accessMode ?? null
  const expectedPolicy = describeExpectedSecurityPolicy(env.envVars)

  const report = {
    schema: 'acomopms-lan-security-check/2',
    accessMode,
    lanHost: env.lanHost,
    httpPort: env.httpPort,
    internalPorts: ports,
    probeHosts: [],
    probes: [],
    expectedPolicy,
    ok: true,
    notes: [],
  }

  if (ports.includes(env.httpPort)) {
    report.ok = false
    report.notes.push(
      `ACOMOPMS_HTTP_PORT (${env.httpPort}) coincide com porta interna Supabase — ajuste servidor.env`,
    )
  }

  let probeHosts = []
  try {
    probeHosts = resolveSecurityProbeHosts(env)
  } catch (e) {
    report.ok = false
    report.notes.push(e instanceof Error ? e.message : String(e))
  }

  report.probeHosts = probeHosts.map((h) => h.host)

  const loopbackOnly =
    probeHosts.length === 0 && isLoopbackLanHost(env.lanHost)
  if (loopbackOnly) {
    report.notes.push(
      'lanHost é loopback: probes externos omitidos (ambiente CI ou sem IPv4 LAN).',
    )
  }

  if (!skipProbe && probeHosts.length > 0) {
    for (const { host, role } of probeHosts) {
      for (const port of ports) {
        const open = await probeTcp(host, port)
        report.probes.push({ port, host, role, reachable: open })
      }
    }
    const evalResult = evaluateInternalPortProbes(report.probes)
    if (!evalResult.ok) {
      report.ok = false
    }
  }

  if (accessMode === 'internet') {
    report.notes.push(
      `Firewall esperado: ${expectedPolicy.httpAllowRule.displayName} (interface ${expectedPolicy.httpAllowRule.interfaceAlias ?? 'n/a'}, remoto ${expectedPolicy.httpAllowRule.remoteAddress ?? 'n/a'}).`,
    )
  }

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log('=== Verificação segurança LAN / Tailscale ===')
    console.log(`Modo: ${accessMode ?? 'legado'} | Host público: ${env.lanHost} | HTTP: ${env.httpPort}`)
    console.log(`Hosts sondados: ${report.probeHosts.join(', ') || '(nenhum)'}`)
    console.log(`Portas internas (config): ${ports.join(', ')}`)
    for (const p of report.probes) {
      const mark = p.reachable ? '❌ ABERTA' : '✅ bloqueada ou indisponível'
      console.log(`  TCP ${p.host}:${p.port} [${p.role}] — ${mark}`)
    }
    for (const n of report.notes) console.log(`ℹ️  ${n}`)
    console.log(
      report.ok
        ? '\n✅ Segurança OK (probes TCP; confirme firewall real no Windows se necessário)'
        : '\n❌ Falha — aplique aplicar-seguranca-lan-firewall (Windows) ou ufw (Linux)',
    )
  }

  process.exit(report.ok ? 0 : 1)
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isCli) {
  main().catch((e) => {
    console.error(e)
    process.exit(2)
  })
}
