import type { AppData } from '@/types'

export interface AppDataPayloadMetrics {
  bytes: number
  kb: number
  pedidos: number
  anexosArquivos: number
  anexosPorPedido: number
  anexosComBase64: number
  chatMensagens: number
}

function countBase64Anexos(data: AppData): number {
  let n = 0
  for (const a of data.arquivos ?? []) {
    if (a.conteudoBase64) n += 1
  }
  const porPedido = data.planilhaAnexosPorPedido ?? {}
  for (const list of Object.values(porPedido)) {
    for (const a of list ?? []) {
      if (a.conteudoBase64) n += 1
    }
  }
  const envio = data.pedidoPlanilhaEnvio ?? {}
  for (const state of Object.values(envio)) {
    for (const a of state?.anexos ?? []) {
      if (a.conteudoBase64) n += 1
    }
  }
  return n
}

function countAnexosPorPedido(data: AppData): number {
  const porPedido = data.planilhaAnexosPorPedido ?? {}
  return Object.values(porPedido).reduce((acc, list) => acc + (list?.length ?? 0), 0)
}

/** Inventário leve do snapshot (Fase 0 — diagnóstico de egress). */
export function measureAppDataPayload(data: AppData): AppDataPayloadMetrics {
  const json = JSON.stringify(data)
  const bytes =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(json).length
      : json.length
  return {
    bytes,
    kb: Math.round((bytes / 1024) * 10) / 10,
    pedidos: data.pedidos?.length ?? 0,
    anexosArquivos: data.arquivos?.length ?? 0,
    anexosPorPedido: countAnexosPorPedido(data),
    anexosComBase64: countBase64Anexos(data),
    chatMensagens: data.chatMensagens?.length ?? 0,
  }
}

/** Loga no console em saves cloud (sem alterar o fluxo). */
export function logAppDataPayloadMetrics(data: AppData, context: string): void {
  try {
    const m = measureAppDataPayload(data)
    console.info(
      `[AcompSolemp][app_state] ${context}: ${m.kb} KB · pedidos=${m.pedidos} · anexosBase64=${m.anexosComBase64} · chat=${m.chatMensagens}`,
    )
  } catch {
    // métrica nunca quebra o save
  }
}
