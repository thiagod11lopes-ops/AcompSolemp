/**
 * Flags da migração do monolito `app_state` → tabelas normalizadas.
 * Fases 2–9: dual-write + leitura + strip do blob para domínios migrados.
 *
 * Override opcional (debug):
 *   localStorage.setItem('acompsolemp:normalized:pedidos:read', '1')
 *   localStorage.setItem('acompsolemp:normalized:pedidos:write', '1')
 */

export type NormalizedDomain =
  | 'pedidos'
  | 'anexos'
  | 'historico'
  | 'chat'
  | 'reversoes'
  | 'notificacoes'
  | 'arquivados'
  | 'cadastros'
  | 'config'
  | 'auxiliares'

type DomainFlags = Record<NormalizedDomain, boolean>

/** Dual-write: espelha no SQL além do blob. */
const DEFAULT_DUAL_WRITE: DomainFlags = {
  pedidos: true,
  anexos: true,
  historico: true,
  chat: true,
  reversoes: true,
  notificacoes: true,
  arquivados: true,
  cadastros: true,
  config: true,
  auxiliares: true,
}

/** Leitura cutover: listas/detalhe leem a tabela (fallback blob se vazio). */
const DEFAULT_READ: DomainFlags = {
  pedidos: true,
  anexos: true,
  historico: true,
  chat: true,
  reversoes: true,
  notificacoes: true,
  arquivados: true,
  cadastros: true,
  config: true,
  auxiliares: true,
}

/** Quando true, o domínio deixa de ser incluído no payload de `app_state` (Fase 9). */
const DEFAULT_STRIP_FROM_BLOB: DomainFlags = {
  pedidos: true,
  anexos: true,
  historico: true,
  chat: true,
  reversoes: true,
  notificacoes: true,
  arquivados: true,
  cadastros: true,
  config: true,
  auxiliares: true,
}

const STORAGE_PREFIX = 'acompsolemp:normalized:'

function readOverride(key: string): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (raw === '1' || raw === 'true') return true
    if (raw === '0' || raw === 'false') return false
  } catch {
    // private mode
  }
  return null
}

export function isNormalizedDualWriteEnabled(domain: NormalizedDomain): boolean {
  const override = readOverride(`${domain}:write`)
  if (override != null) return override
  return DEFAULT_DUAL_WRITE[domain]
}

export function isNormalizedReadEnabled(domain: NormalizedDomain): boolean {
  const override = readOverride(`${domain}:read`)
  if (override != null) return override
  return DEFAULT_READ[domain]
}

export function isNormalizedStripFromBlobEnabled(domain: NormalizedDomain): boolean {
  const override = readOverride(`${domain}:strip`)
  if (override != null) return override
  return DEFAULT_STRIP_FROM_BLOB[domain]
}

export function hasAnyNormalizedDomainEnabled(): boolean {
  return (Object.keys(DEFAULT_READ) as NormalizedDomain[]).some(
    (d) =>
      isNormalizedReadEnabled(d) ||
      isNormalizedDualWriteEnabled(d) ||
      isNormalizedStripFromBlobEnabled(d),
  )
}

/** Baseline: sync ao vivo em `app_state` via Realtime + refresh mount/foco. */
export const APP_STATE_REALTIME_BASELINE =
  'Realtime postgres_changes em public.app_state (tenant_id); refresh no mount/foco; sem polling periódico.'
