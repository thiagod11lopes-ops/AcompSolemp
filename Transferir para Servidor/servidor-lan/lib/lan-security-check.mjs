import net from 'node:net'
import { detectPhysicalLanIPv4 } from './auth-redirects.mjs'
import { buildHttpAllowRulePlanFromEnv, parseFirewallScope } from './firewall-lan-plan.mjs'
import {
  isTailscaleCgcatIpv4,
  isValidTsNetHostname,
  parseAccessMode,
} from './load-servidor-env.mjs'

/** @param {string} host */
export function isLoopbackLanHost(host) {
  const h = String(host).trim().toLowerCase()
  return h === '127.0.0.1' || h === 'localhost'
}

/** @param {string} host */
export function isExpectedPublicHostForInternet(host) {
  const h = String(host).trim().toLowerCase().replace(/\.$/, '')
  return isValidTsNetHostname(h) || isTailscaleCgcatIpv4(h)
}

/**
 * Hosts onde portas internas Supabase NÃO devem estar acessíveis (TCP).
 * @param {ReturnType<import('./load-servidor-env.mjs').loadServidorEnv>} cfg
 * @param {{ physicalLanIPv4?: string | null }} [options]
 */
export function resolveSecurityProbeHosts(cfg, options = {}) {
  const accessMode = cfg.accessMode ?? parseAccessMode(cfg.envVars)
  const hosts = []

  if (accessMode === 'internet') {
    if (!isExpectedPublicHostForInternet(cfg.lanHost)) {
      throw new Error(
        `Modo internet: lanHost deve ser MagicDNS (*.ts.net) ou IPv4 Tailscale, obtido: ${cfg.lanHost}`,
      )
    }
    hosts.push({ host: cfg.lanHost, role: 'canonical-tailscale' })

    const physical =
      options.physicalLanIPv4 !== undefined
        ? options.physicalLanIPv4
        : detectPhysicalLanIPv4()
    if (
      physical &&
      physical !== cfg.lanHost &&
      !isTailscaleCgcatIpv4(physical)
    ) {
      hosts.push({ host: physical, role: 'physical-lan-secondary' })
    }
    return hosts
  }

  if (!isLoopbackLanHost(cfg.lanHost)) {
    hosts.push({ host: cfg.lanHost, role: 'lan' })
  }
  return hosts
}

/**
 * Política esperada (planejada) — não consulta firewall real do Windows.
 * @param {Record<string, string | undefined>} envVars
 */
export function describeExpectedSecurityPolicy(envVars = {}) {
  const firewallScope = parseFirewallScope(envVars)
  const httpRulePlan = buildHttpAllowRulePlanFromEnv(envVars)
  return {
    firewallScope,
    httpAllowRule: {
      mode: httpRulePlan.mode,
      displayName: httpRulePlan.displayName,
      interfaceAlias: httpRulePlan.interfaceAlias,
      remoteAddress: httpRulePlan.remoteAddress,
      profiles: httpRulePlan.profiles,
      excludedProfiles: httpRulePlan.excludedProfiles ?? [],
    },
    supabaseInternalPorts:
      'Bloqueio inbound em todos os perfis e qualquer origem via aplicar-seguranca-lan-firewall (script manifesto). Cobre LAN em perfil Public e clientes Tailscale; nao inclui a porta HTTP.',
    managerAdminApi:
      'Fora do escopo AcompOPMS; Servidor Manager permanece em 127.0.0.1:47831 (nao alterado por estes scripts).',
  }
}

/**
 * @param {Array<{ host: string, port: number, reachable: boolean, role?: string }>} probes
 */
export function evaluateInternalPortProbes(probes) {
  const failures = probes.filter((p) => p.reachable)
  return {
    ok: failures.length === 0,
    failures,
  }
}

/** @param {string} host @param {number} port @param {number} [ms] */
export function probeTcp(host, port, ms = 2500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    let settled = false
    const done = (open) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(open)
    }
    socket.setTimeout(ms)
    socket.on('connect', () => done(true))
    socket.on('timeout', () => done(false))
    socket.on('error', () => done(false))
  })
}
