import { collectAuthRedirectOrigins } from './auth-redirects.mjs'
import { isTailscaleCgcatIpv4, isValidTsNetHostname } from './load-servidor-env.mjs'

function isPrivateLanIPv4(hostname) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname)
  if (!m) return false
  const o = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]
  if (!o.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) return false
  if (o[0] === 10) return true
  if (o[0] === 192 && o[1] === 168) return true
  if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true
  return false
}

/** @param {string} hostname */
export function isAllowedAuthRedirectHost(hostname) {
  const lower = String(hostname).trim().toLowerCase()
  if (lower === 'localhost' || lower === '127.0.0.1') return true
  if (isValidTsNetHostname(lower)) return true
  if (isTailscaleCgcatIpv4(lower)) return true
  if (isPrivateLanIPv4(lower)) return true
  return false
}

/** @param {string} url */
export function assertAllowedRedirectEntry(url) {
  const raw = String(url).trim()
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    throw new Error(`Redirect URL invalida (esquema): ${raw}`)
  }
  const base = raw.endsWith('/**') ? raw.slice(0, -3) : raw
  let parsed
  try {
    parsed = new URL(base)
  } catch {
    throw new Error(`Redirect URL malformada: ${raw}`)
  }
  if (parsed.username || parsed.password) {
    throw new Error(`Redirect URL nao pode conter credenciais: ${raw}`)
  }
  if (!isAllowedAuthRedirectHost(parsed.hostname)) {
    throw new Error(`Redirect URL com host nao permitido: ${raw}`)
  }
}

/** @param {string} siteUrl */
export function assertAllowedSiteUrl(siteUrl) {
  const raw = String(siteUrl).trim().replace(/\/+$/, '')
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error(`site_url malformado: ${raw}`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`site_url deve ser http(s): ${raw}`)
  }
  if (!isAllowedAuthRedirectHost(parsed.hostname)) {
    throw new Error(`site_url com host nao permitido: ${raw}`)
  }
}

/**
 * @param {import('./load-servidor-env.mjs').loadServidorEnv extends () => infer R ? R : never} cfg
 */
export function buildSupabaseAuthConfigFromServidorCfg(cfg) {
  const siteUrl = cfg.publicOrigin.replace(/\/+$/, '')
  assertAllowedSiteUrl(siteUrl)
  const additionalRedirectUrls = collectAuthRedirectOrigins(cfg)
  for (const entry of additionalRedirectUrls) {
    assertAllowedRedirectEntry(entry)
  }
  return { siteUrl, additionalRedirectUrls }
}

/** @param {string[]} urls */
export function formatAdditionalRedirectUrlsToml(urls) {
  return `[${urls.map((u) => `"${String(u).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(', ')}]`
}

/**
 * @param {string} configTomlText
 * @param {{ siteUrl: string, additionalRedirectUrls: string[] }} patch
 */
export function applySupabaseAuthConfigToToml(configTomlText, patch) {
  const redirectsToml = formatAdditionalRedirectUrlsToml(patch.additionalRedirectUrls)
  let text = configTomlText
  text = text.replace(/^site_url\s*=\s*"[^"]*"\s*$/m, `site_url = "${patch.siteUrl}"`)
  text = text.replace(
    /^additional_redirect_urls\s*=\s*\[[\s\S]*?\]\s*$/m,
    `additional_redirect_urls = ${redirectsToml}`,
  )
  return text
}

/** @param {string} configTomlText */
export function readSupabaseAuthConfigFromToml(configTomlText) {
  const siteMatch = /^site_url\s*=\s*"([^"]*)"\s*$/m.exec(configTomlText)
  const blockMatch = /^additional_redirect_urls\s*=\s*\[([\s\S]*?)\]\s*$/m.exec(configTomlText)
  const siteUrl = siteMatch?.[1] ?? null
  const additionalRedirectUrls = []
  if (blockMatch?.[1]) {
    const re = /"((?:\\.|[^"\\])*)"/g
    let m
    while ((m = re.exec(blockMatch[1])) !== null) {
      additionalRedirectUrls.push(m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'))
    }
  }
  return { siteUrl, additionalRedirectUrls }
}
