import { loadConnectionJson } from './connection-json.mjs'
import { startWireGuardTunnel } from './wireguard-run.mjs'
import { resolveInstallDirFromConfig } from '../install-dir.mjs'

/**
 * Antes de abrir a UI: opcionalmente sobe WireGuard se connection.json existir.
 * @param {{ cwd: string, configPath?: string }} opts
 */
export async function bootstrapOverlayForClient(opts) {
  const installDir = resolveInstallDirFromConfig(opts.cwd, opts.configPath)
  if (!installDir) {
    return { overlayStartUrl: null, tunnel: null }
  }

  let conn
  try {
    conn = loadConnectionJson(installDir)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { overlayStartUrl: null, tunnel: { status: 'failed', message: msg } }
  }
  if (!conn) {
    return { overlayStartUrl: null, tunnel: null }
  }

  const tunnel = startWireGuardTunnel(installDir, conn)
  let overlayStartUrl = null
  if (conn.server?.loginUrl) {
    overlayStartUrl = String(conn.server.loginUrl)
  } else if (conn.server?.overlayOrigin) {
    overlayStartUrl = `${String(conn.server.overlayOrigin).replace(/\/+$/, '')}/login`
  }

  return { overlayStartUrl, tunnel, connection: conn }
}
