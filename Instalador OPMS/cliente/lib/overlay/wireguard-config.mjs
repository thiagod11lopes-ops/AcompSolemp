/** @param {Record<string, any>} conn documento connection.json validado */
export function buildWireGuardConf(conn) {
  const wg = conn.overlay.wireguard
  const peer = wg.peer
  const lines = [
    '[Interface]',
    `PrivateKey = ${wg.privateKey}`,
    `Address = ${wg.address}`,
  ]
  if (wg.dns) lines.push(`DNS = ${wg.dns}`)
  lines.push('', '[Peer]', `PublicKey = ${peer.publicKey}`, `Endpoint = ${peer.endpoint}`)
  if (peer.allowedIPs) lines.push(`AllowedIPs = ${peer.allowedIPs}`)
  if (peer.persistentKeepalive != null) {
    lines.push(`PersistentKeepalive = ${peer.persistentKeepalive}`)
  }
  return `${lines.join('\n')}\n`
}
