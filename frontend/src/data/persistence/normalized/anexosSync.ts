import type { AppData, ArquivoAnexo } from '@/types'
import { stripAnexoBase64FromAppData } from '@/data/persistence/appDataAnexoSanitize'
import { dualWriteDomainRows, readDomainRows } from '@/data/persistence/normalized/domainSync'
import { isNormalizedReadEnabled } from '@/config/normalizedDataFlags'

function collectAnexos(data: AppData): ArquivoAnexo[] {
  const byId = new Map<string, ArquivoAnexo>()
  const push = (list: ArquivoAnexo[] | undefined) => {
    for (const a of list ?? []) {
      if (!a?.id) continue
      const prev = byId.get(a.id)
      const score = (a.storagePath ? 2 : 0) + (a.conteudoBase64 ? 1 : 0)
      const prevScore = prev
        ? (prev.storagePath ? 2 : 0) + (prev.conteudoBase64 ? 1 : 0)
        : -1
      if (!prev || score >= prevScore) {
        const { conteudoBase64: _b, ...rest } = a
        byId.set(a.id, rest)
      }
    }
  }
  push(data.arquivos)
  for (const list of Object.values(data.planilhaAnexosPorPedido ?? {})) push(list)
  for (const state of Object.values(data.pedidoPlanilhaEnvio ?? {})) push(state?.anexos)
  return [...byId.values()]
}

export async function dualWriteAnexos(data: AppData): Promise<void> {
  const leve = stripAnexoBase64FromAppData(data)
  const anexos = collectAnexos(leve)
  await dualWriteDomainRows(
    'anexos',
    'anexos',
    anexos.map((a) => ({
      id: a.id,
      pedido_id: a.pedidoId,
      storage_path: a.storagePath,
      data: a,
    })),
  )
}

export async function mergeAnexosFromNormalized(data: AppData): Promise<AppData> {
  if (!isNormalizedReadEnabled('anexos')) return data
  const rows = await readDomainRows<ArquivoAnexo>('anexos', 'anexos')
  if (!rows || rows.length === 0) return data

  const porPedido: Record<string, ArquivoAnexo[]> = { ...(data.planilhaAnexosPorPedido ?? {}) }
  for (const a of rows) {
    if (!a.pedidoId) continue
    const list = porPedido[a.pedidoId] ?? []
    const idx = list.findIndex((x) => x.id === a.id)
    if (idx >= 0) list[idx] = { ...list[idx], ...a, conteudoBase64: undefined }
    else list.push({ ...a, conteudoBase64: undefined })
    porPedido[a.pedidoId] = list
  }

  return {
    ...data,
    arquivos: rows.map((a) => ({ ...a, conteudoBase64: undefined })),
    planilhaAnexosPorPedido: porPedido,
  }
}
