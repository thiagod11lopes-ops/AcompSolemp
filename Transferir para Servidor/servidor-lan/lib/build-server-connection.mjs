import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './load-servidor-env.mjs'

function readManifestVersion(root) {
  try {
    const raw = readFileSync(resolve(root, 'server-manifest.json'), 'utf8')
    const m = JSON.parse(raw)
    return m.manifestVersion ?? '1.0.0'
  } catch {
    return '1.0.0'
  }
}

/** Descritor HTTP servido em /server-connection.json (Manager + clientes). */
export function buildServerConnectionDescriptor(envPath) {
  const root = resolve(SERVIDOR_LAN_DIR, '../..')
  const cfg = loadServidorEnv(envPath)
  const origin = cfg.publicOrigin.replace(/\/+$/, '')

  return {
    schema: 'acomopms-server-connection/1',
    manifestVersion: readManifestVersion(root),
    generatedAt: new Date().toISOString(),
    product: 'AcompOPMS',
    accessMode: cfg.overlayEnabled && cfg.overlayLoginUrl ? 'overlay' : 'lan',
    lan: {
      host: cfg.lanHost,
      httpPort: cfg.httpPort,
      origin,
      loginUrl: cfg.loginUrl,
      supabaseUrl: cfg.supabasePublicUrl,
    },
    overlay: {
      enabled: cfg.overlayEnabled,
      host: cfg.overlayHost,
      origin: cfg.overlayOrigin,
      loginUrl: cfg.overlayLoginUrl,
      headscaleUrl: cfg.overlay.headscaleUrl,
      namespace: cfg.overlay.namespace,
      serverName: cfg.overlay.serverName,
      wgPort: cfg.overlay.wgPort,
      publicEndpoint: cfg.overlay.publicEndpoint,
      status: cfg.overlayEnabled ? 'configured-pending-etapas-5-6' : 'disabled',
      notes:
        'Overlay WireGuard/Headscale: Etapas 5–6 (servidor) e 12 (cliente). Enquanto disabled, use apenas LAN.',
    },
    client: {
      recommendedStartUrl: cfg.overlayLoginUrl ?? cfg.loginUrl,
      discoveryPath: '/server-connection.json',
      pairingFile: 'connection.json',
    },
    repository: {
      name: 'AcompSolemp',
      serverManifestPath: '/server-manifest.json',
    },
  }
}
