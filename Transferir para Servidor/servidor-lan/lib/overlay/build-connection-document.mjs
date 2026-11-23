import { parseWireGuardEndpoint } from './parse-endpoint.mjs'

/**
 * @param {{
 *   clientPrivateKey: string,
 *   clientAddress: string,
 *   serverPublicKey: string,
 *   publicEndpoint: string,
 *   serverOverlayHost: string,
 *   httpPort: number,
 *   clientName?: string,
 * }} opts
 */
export function buildConnectionDocument(opts) {
  const endpoint = parseWireGuardEndpoint(opts.publicEndpoint)
  const overlayOrigin = `http://${opts.serverOverlayHost}:${opts.httpPort}`
  return {
    schema: 'acomopms-connection/1',
    generatedAt: new Date().toISOString(),
    clientName: opts.clientName ?? null,
    overlay: {
      enabled: true,
      wireguard: {
        interfaceName: 'acomopms',
        address: opts.clientAddress,
        privateKey: opts.clientPrivateKey,
        dns: '1.1.1.1',
        peer: {
          publicKey: opts.serverPublicKey,
          endpoint,
          allowedIPs: `${opts.serverOverlayHost}/32`,
          persistentKeepalive: 25,
        },
      },
    },
    server: {
      overlayOrigin,
      loginUrl: `${overlayOrigin}/login`,
    },
  }
}
