import { readFileSync, writeFileSync } from 'node:fs'
import { WG_SERVER_CONF_PATH } from './overlay-paths.mjs'

/**
 * @param {{ publicKey: string, allowedIPs: string, comment?: string }} peer
 */
export function appendPeerToServerConf(peer) {
  let text = readFileSync(WG_SERVER_CONF_PATH, 'utf8')
  const block = [
    '',
    peer.comment ? `# ${peer.comment}` : '',
    '[Peer]',
    `PublicKey = ${peer.publicKey}`,
    `AllowedIPs = ${peer.allowedIPs}`,
  ]
    .filter(Boolean)
    .join('\n')
  if (text.includes(`PublicKey = ${peer.publicKey}`)) {
    return false
  }
  text = `${text.replace(/\s+$/, '')}\n${block}\n`
  writeFileSync(WG_SERVER_CONF_PATH, text, 'utf8')
  return true
}
