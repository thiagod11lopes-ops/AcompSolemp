import { networkInterfaces } from 'node:os'
import { isTailscaleCgcatIpv4, parseAccessMode } from './load-servidor-env.mjs'

/** @param {string} origin ex.: http://192.168.0.1:8080 */
export function redirectSet(origin) {
  const o = origin.replace(/\/+$/, '')
  return [
    o,
    `${o}/**`,
    `${o}/login`,
    `${o}/login/**`,
    `${o}/redefinir-senha`,
    `${o}/redefinir-senha/**`,
  ]
}

const DEV_VITE_REDIRECTS = [
  'http://localhost:5173',
  'http://localhost:5173/**',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5173/**',
]

function loopbackRedirectSets(httpPort) {
  return [
    ...redirectSet(`http://127.0.0.1:${httpPort}`),
    ...redirectSet(`http://localhost:${httpPort}`),
  ]
}

/** @param {string} publicOrigin */
function canonicalHostFromOrigin(publicOrigin) {
  try {
    return new URL(publicOrigin).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** @param {string} host @param {number} port */
function httpOrigin(host, port) {
  return `http://${host}:${port}`
}

/**
 * IPv4 LAN físico (Wi‑Fi/Ethernet), excluindo Tailscale CGNAT e loopback.
 * @returns {string | null}
 */
export function detectPhysicalLanIPv4() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    if (/tailscale/i.test(name)) continue
    for (const net of nets[name] ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue
      const addr = net.address
      if (addr.startsWith('127.') || addr.startsWith('169.254.')) continue
      if (isTailscaleCgcatIpv4(addr)) continue
      return addr
    }
  }
  return null
}

/** @returns {string | null} */
export function detectTailscaleIPv4() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && isTailscaleCgcatIpv4(net.address)) {
        return net.address
      }
    }
  }
  return null
}

/**
 * Origens secundárias para modo internet + SECONDARY_LAN_REDIRECTS=auto.
 * @param {{
 *   publicOrigin: string,
 *   httpPort: number,
 *   detectPhysicalLanIPv4?: () => string | null,
 *   detectTailscaleIPv4?: () => string | null,
 * }} input
 * @returns {string[]}
 */
export function collectSecondaryInternetRedirectOrigins(input) {
  const detectPhysical = input.detectPhysicalLanIPv4 ?? detectPhysicalLanIPv4
  const detectTs = input.detectTailscaleIPv4 ?? detectTailscaleIPv4
  const port = input.httpPort
  const siteUrl = input.publicOrigin.replace(/\/+$/, '')
  const canonicalHost = canonicalHostFromOrigin(siteUrl)
  const origins = []

  const physical = detectPhysical()
  if (physical && !isTailscaleCgcatIpv4(physical)) {
    const origin = httpOrigin(physical, port)
    if (origin !== siteUrl && physical !== canonicalHost) {
      origins.push(origin)
    }
  }

  const tailscaleIp = detectTs()
  if (tailscaleIp && tailscaleIp !== canonicalHost) {
    const origin = httpOrigin(tailscaleIp, port)
    if (origin !== siteUrl && !origins.includes(origin)) {
      origins.push(origin)
    }
  }

  return origins
}

function resolveAccessMode(cfg) {
  if (cfg.accessMode === 'internet' || cfg.accessMode === 'local') return cfg.accessMode
  if (cfg.envVars) return parseAccessMode(cfg.envVars)
  return null
}

function isSecondaryLanRedirectsAuto(cfg) {
  const raw =
    cfg.secondaryLanRedirects ??
    cfg.envVars?.ACOMOPMS_SECONDARY_LAN_REDIRECTS ??
    ''
  return String(raw).trim().toLowerCase() === 'auto'
}

/**
 * @param {{
 *   publicOrigin: string,
 *   httpPort: number,
 *   overlayOrigin?: string | null,
 *   accessMode?: 'internet' | 'local' | null,
 *   envVars?: Record<string, string>,
 *   secondaryLanRedirects?: string,
 *   detectPhysicalLanIPv4?: () => string | null,
 *   detectTailscaleIPv4?: () => string | null,
 * }} cfg
 */
export function collectAuthRedirectOrigins(cfg) {
  const siteUrl = cfg.publicOrigin.replace(/\/+$/, '')
  const redirects = [
    ...redirectSet(siteUrl),
    ...loopbackRedirectSets(cfg.httpPort),
    ...DEV_VITE_REDIRECTS,
  ]

  const accessMode = resolveAccessMode(cfg)
  if (accessMode === 'internet' && isSecondaryLanRedirectsAuto(cfg)) {
    for (const origin of collectSecondaryInternetRedirectOrigins(cfg)) {
      redirects.push(...redirectSet(origin))
    }
  }

  if (cfg.overlayOrigin) {
    redirects.push(...redirectSet(cfg.overlayOrigin.replace(/\/+$/, '')))
  }
  return [...new Set(redirects)]
}
