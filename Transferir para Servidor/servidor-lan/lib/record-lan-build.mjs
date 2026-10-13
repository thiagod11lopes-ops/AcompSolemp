import { writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './load-servidor-env.mjs'

export function recordLanBuildManifest() {
  const root = resolve(SERVIDOR_LAN_DIR, '../..')
  const dist = resolve(root, 'frontend/dist')
  if (!existsSync(dist)) return
  const cfg = loadServidorEnv()
  const manifest = {
    publicOrigin: cfg.publicOrigin.replace(/\/+$/, ''),
    lanHost: cfg.lanHost,
    httpPort: cfg.httpPort,
    builtAt: new Date().toISOString(),
    viteDataSource: 'supabase',
    note: 'API Supabase via mesma origem (Caddy proxy)',
  }
  writeFileSync(resolve(dist, 'lan-build.json'), JSON.stringify(manifest, null, 2), 'utf8')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  recordLanBuildManifest()
  console.log('[servidor-lan] lan-build.json gravado em frontend/dist')
}
