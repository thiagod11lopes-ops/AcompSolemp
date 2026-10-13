/**
 * Opcional: alinha startUrl com server-connection.json do servidor LAN.
 * @param {string} origin ex.: http://192.168.0.42:8080
 * @param {string} currentStartUrl
 * @param {number} [timeoutMs]
 */
export async function resolveStartUrlFromServer(origin, currentStartUrl, timeoutMs = 8000) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const r = await fetch(`${origin.replace(/\/+$/, '')}/server-connection.json`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!r.ok) return { startUrl: currentStartUrl, source: 'config-only', detail: `HTTP ${r.status}` }
    const body = await r.json()
    const recommended =
      body?.client?.recommendedStartUrl || body?.lan?.loginUrl || body?.overlay?.loginUrl
    if (typeof recommended === 'string' && recommended.startsWith('http')) {
      return { startUrl: recommended, source: 'server-connection.json', connection: body }
    }
    return { startUrl: currentStartUrl, source: 'config-only', connection: body }
  } catch (e) {
    return {
      startUrl: currentStartUrl,
      source: 'config-only',
      detail: e instanceof Error ? e.message : String(e),
    }
  } finally {
    clearTimeout(t)
  }
}
