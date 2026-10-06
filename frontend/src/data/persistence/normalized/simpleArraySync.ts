import type { AppData } from '@/types'
import type { NormalizedDomain } from '@/config/normalizedDataFlags'
import { isNormalizedReadEnabled } from '@/config/normalizedDataFlags'
import { dualWriteDomainRows, readDomainRows } from '@/data/persistence/normalized/domainSync'

type IdRow = { id: string }

/** Dual-write de um array AppData → tabela (tenant_id, id, data). */
export async function dualWriteSimpleArray(
  domain: NormalizedDomain,
  table: string,
  rows: IdRow[] | undefined,
  options?: { requireSuccess?: boolean },
): Promise<void> {
  const list = (rows ?? []).filter((r) => r && typeof r.id === 'string' && r.id)
  await dualWriteDomainRows(
    domain,
    table,
    list.map((r) => ({ id: r.id, data: r })),
    options,
  )
}

/** Merge: se a tabela tiver linhas, substitui o array do blob. */
export async function mergeSimpleArrayFromNormalized<T extends IdRow>(
  domain: NormalizedDomain,
  table: string,
  data: AppData,
  field: keyof AppData,
): Promise<AppData> {
  if (!isNormalizedReadEnabled(domain)) return data
  const rows = await readDomainRows<T>(domain, table)
  if (!rows || rows.length === 0) return data
  return { ...data, [field]: rows }
}
