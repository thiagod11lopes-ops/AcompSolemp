import type { AppData, ArquivoAnexo } from '@/types'

function stripBase64FromAnexo(arquivo: ArquivoAnexo): ArquivoAnexo {
  if (!arquivo.conteudoBase64) return arquivo
  const { conteudoBase64: _omit, ...rest } = arquivo
  return rest
}

function mapAnexoList(list: ArquivoAnexo[] | undefined): ArquivoAnexo[] | undefined {
  if (!list) return list
  return list.map(stripBase64FromAnexo)
}

/**
 * Remove `conteudoBase64` de todos os anexos do snapshot.
 * Em cloud o arquivo fica no Storage (`storagePath`); base64 no JSON infla egress.
 */
export function stripAnexoBase64FromAppData(data: AppData): AppData {
  const next: AppData = {
    ...data,
    arquivos: mapAnexoList(data.arquivos) ?? [],
  }

  if (data.planilhaAnexosPorPedido) {
    const porPedido: Record<string, ArquivoAnexo[]> = {}
    for (const [pedidoId, list] of Object.entries(data.planilhaAnexosPorPedido)) {
      porPedido[pedidoId] = mapAnexoList(list) ?? []
    }
    next.planilhaAnexosPorPedido = porPedido
  }

  if (data.pedidoPlanilhaEnvio) {
    const envio = { ...data.pedidoPlanilhaEnvio }
    for (const [pedidoId, state] of Object.entries(envio)) {
      if (!state) continue
      envio[pedidoId] = {
        ...state,
        anexos: mapAnexoList(state.anexos),
      }
    }
    next.pedidoPlanilhaEnvio = envio
  }

  return next
}

/** Conta anexos que ainda têm base64 (diagnóstico / migração). */
export function countAnexosComBase64(data: AppData): number {
  let n = 0
  for (const a of data.arquivos ?? []) {
    if (a.conteudoBase64) n += 1
  }
  for (const list of Object.values(data.planilhaAnexosPorPedido ?? {})) {
    for (const a of list ?? []) {
      if (a.conteudoBase64) n += 1
    }
  }
  for (const state of Object.values(data.pedidoPlanilhaEnvio ?? {})) {
    for (const a of state?.anexos ?? []) {
      if (a.conteudoBase64) n += 1
    }
  }
  return n
}
