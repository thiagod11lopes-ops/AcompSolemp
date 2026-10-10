import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './load-servidor-env.mjs'
import { OVERLAY_STATE_PATH } from './overlay/overlay-paths.mjs'

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

  let overlayStatus = cfg.overlayEnabled ? 'enabled-pending-config' : 'disabled'
  let serverPublicKey = null
  if (existsSync(OVERLAY_STATE_PATH)) {
    try {
      const st = JSON.parse(readFileSync(OVERLAY_STATE_PATH, 'utf8'))
      overlayStatus = st.status || 'server-ready'
      serverPublicKey = st.serverPublicKey ?? null
    } catch {
      overlayStatus = 'state-invalid'
    }
  }

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
      status: overlayStatus,
      serverPublicKey,
      notes:
        cfg.overlayEnabled
          ? 'Etapa 5: servidor WG; Etapa 6: export connection.json; Etapa 12: cliente.'
          : 'Defina ACOMOPMS_OVERLAY_ENABLED=true e rode aplicar-overlay-servidor para internet.',
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
