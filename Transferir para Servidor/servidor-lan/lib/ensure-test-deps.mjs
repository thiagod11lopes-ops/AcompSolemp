import { existsSync, lstatSync, readFileSync, readlinkSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SERVIDOR_LAN_DIR } from './load-servidor-env.mjs'

const SUPABASE_JS = '@supabase/supabase-js'

function readSupabaseJsVersion(nodeModulesDir) {
  const pkgPath = resolve(nodeModulesDir, SUPABASE_JS, 'package.json')
  if (!existsSync(pkgPath)) return null
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  return typeof pkg.version === 'string' ? pkg.version : null
}

function removeNodeModulesLink(link) {
  let target = null
  try {
    target = readlinkSync(link)
  } catch {
    target = null
  }
  if (target != null) {
    try {
      unlinkSync(link)
    } catch {
      rmdirSync(link)
    }
    return
  }
  const st = lstatSync(link)
  if (st.isDirectory()) {
    throw new Error(
      `${link} e uma pasta real e nao aponta para frontend/node_modules. O teste nao apaga essa pasta.`,
    )
  }
  unlinkSync(link)
}

/** Permite import @supabase/supabase-js nos testes (usa a copia ja instalada em frontend/node_modules). */
export function ensureServidorLanNodeModules() {
  const root = resolve(SERVIDOR_LAN_DIR, '../..')
  const frontendNm = resolve(root, 'frontend/node_modules')
  const link = resolve(SERVIDOR_LAN_DIR, 'node_modules')
  const frontendVersion = readSupabaseJsVersion(frontendNm)
  if (!frontendVersion) {
    throw new Error(
      `frontend/node_modules/${SUPABASE_JS} ausente. A fase frontend.build precisa concluir npm ci antes deste teste.`,
    )
  }
  if (readSupabaseJsVersion(link) === frontendVersion) return link
  if (existsSync(link)) removeNodeModulesLink(link)
  const type = process.platform === 'win32' ? 'junction' : 'dir'
  symlinkSync(frontendNm, link, type)
  const linkedVersion = readSupabaseJsVersion(link)
  if (linkedVersion !== frontendVersion) {
    throw new Error(
      `Nao foi possivel resolver ${SUPABASE_JS}@${frontendVersion} a partir de ${link} (encontrado: ${linkedVersion ?? 'ausente'}).`,
    )
  }
  return link
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ensureServidorLanNodeModules()
  console.log('[servidor-lan] node_modules de teste OK (link → frontend/node_modules)')
}
