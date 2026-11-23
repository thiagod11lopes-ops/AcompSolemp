/** @param {string} raw ex.: udp://203.0.113.10:51820 ou 203.0.113.10:51820 */
export function parseWireGuardEndpoint(raw) {
  const s = String(raw ?? '').trim()
  if (!s) throw new Error('endpoint vazio')
  const stripped = s.replace(/^udp:\/\//i, '')
  if (!/^\[?[\w.:.-]+\]?:\d+$/.test(stripped) && !/^[\d.a-fA-F:]+:\d+$/.test(stripped)) {
    throw new Error(`endpoint inválido: ${raw}`)
  }
  return stripped
}
