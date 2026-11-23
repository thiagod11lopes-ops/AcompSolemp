/**
 * Normaliza a URL informada pelo Manager/instalador para abrir o AcompOPMS.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeStartUrl(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) throw new Error('URL vazia')

  let url
  try {
    url = new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`)
  } catch {
    throw new Error('URL inválida')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Use http ou https')
  }

  const path = url.pathname.replace(/\/+$/, '') || ''
  if (!path || path === '/') {
    url.pathname = '/login'
  }

  url.hash = ''
  return url.toString()
}

/**
 * Origem (scheme + host + port) para descoberta server-connection.json
 * @param {string} startUrl
 */
export function originFromStartUrl(startUrl) {
  const u = new URL(startUrl)
  return u.origin
}
