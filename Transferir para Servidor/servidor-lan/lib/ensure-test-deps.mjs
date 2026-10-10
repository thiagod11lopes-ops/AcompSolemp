import { existsSync, lstatSync, symlinkSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SERVIDOR_LAN_DIR } from './load-servidor-env.mjs'

/** Permite import @supabase/supabase-js nos testes (usa node_modules do frontend). */
export function ensureServidorLanNodeModules() {
  const root = resolve(SERVIDOR_LAN_DIR, '../..')
  const frontendNm = resolve(root, 'frontend/node_modules')
  const link = resolve(SERVIDOR_LAN_DIR, 'node_modules')

  if (!existsSync(frontendNm)) {
    throw new Error('frontend/node_modules ausente. Rode: cd frontend && npm ci')
  }
  if (existsSync(link)) {
    try {
      const st = lstatSync(link)
      if (st.isSymbolicLink() || st.isDirectory()) return link
    } catch {
      /* recreate */
    }
  }
  try {
    rmSync(link, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
  const type = process.platform === 'win32' ? 'junction' : 'dir'
  symlinkSync(frontendNm, link, type)
  return link
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ensureServidorLanNodeModules()
  console.log('[servidor-lan] node_modules de teste OK (link → frontend/node_modules)')
}
