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

/**
 * @param {{ publicOrigin: string, httpPort: number, overlayOrigin?: string | null }} cfg
 */
export function collectAuthRedirectOrigins(cfg) {
  const siteUrl = cfg.publicOrigin.replace(/\/+$/, '')
  const redirects = [
    ...redirectSet(siteUrl),
    ...redirectSet(`http://127.0.0.1:${cfg.httpPort}`),
    ...redirectSet(`http://localhost:${cfg.httpPort}`),
    'http://localhost:5173',
    'http://localhost:5173/**',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5173/**',
  ]
  if (cfg.overlayOrigin) {
    redirects.push(...redirectSet(cfg.overlayOrigin.replace(/\/+$/, '')))
  }
  return [...new Set(redirects)]
}
