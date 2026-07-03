import type { WorkflowEtapa } from '@/types'

/** Metadados de agrupamento visual da timeline */
export const TIMELINE_ETAPA_META: Record<
  string,
  { grupo: string | null; divisao: string | null }
> = {
  SOLICITACAO: { grupo: null, divisao: null },
  DIV_MAT_AUDITORIA: { grupo: 'Div. de Material', divisao: 'Material' },
  DIV_MAT_CONTABILIDADE_IMH: { grupo: 'Div. de Material', divisao: 'Material' },
  DIV_MAT_ASSINATURA_1: { grupo: 'Div. de Material', divisao: 'Finanças' },
  DIV_MAT_ASSINATURA_2: { grupo: 'Div. de Material', divisao: 'Finanças' },
  DIV_MAT_SDA: { grupo: 'Div. de Material', divisao: 'Finanças' },
  DIV_MAT_FINANCAS: { grupo: 'Div. de Material', divisao: 'Finanças' },
}

/** Fluxos paralelos dentro da Div. de Material */
export const DIVISAO_1_CHAVES = ['DIV_MAT_AUDITORIA', 'DIV_MAT_CONTABILIDADE_IMH'] as const
export const DIVISAO_2_CHAVES = [
  'DIV_MAT_ASSINATURA_1',
  'DIV_MAT_ASSINATURA_2',
  'DIV_MAT_SDA',
  'DIV_MAT_FINANCAS',
] as const

export const DIV_MATERIAL_CHAVES = [...DIVISAO_1_CHAVES, ...DIVISAO_2_CHAVES] as const

export function getProximaChaveNaDivisao(chaveAtual: string): string | null {
  const trilhas = [DIVISAO_1_CHAVES, DIVISAO_2_CHAVES]
  for (const trilha of trilhas) {
    const index = (trilha as readonly string[]).indexOf(chaveAtual)
    if (index >= 0) return trilha[index + 1] ?? null
  }
  return null
}

export function getEtapaByChave(
  etapas: WorkflowEtapa[],
  chave: string,
): WorkflowEtapa | undefined {
  return etapas.find((e) => e.chave === chave)
}

export type TimelineBloco =
  | { tipo: 'etapa'; etapa: WorkflowEtapa; index: number }
  | {
      tipo: 'grupo'
      nome: string
      divisoes: {
        nome: string
        etapas: { etapa: WorkflowEtapa; index: number }[]
      }[]
    }

export function buildTimelineBlocos(etapas: WorkflowEtapa[]): TimelineBloco[] {
  const ordenadas = [...etapas].filter((e) => e.ativo).sort((a, b) => a.ordem - b.ordem)
  const blocos: TimelineBloco[] = []
  let grupoAtual: Extract<TimelineBloco, { tipo: 'grupo' }> | null = null
  let divisaoAtual: string | null = null

  ordenadas.forEach((etapa, index) => {
    const meta = TIMELINE_ETAPA_META[etapa.chave] ?? { grupo: null, divisao: null }

    if (!meta.grupo) {
      grupoAtual = null
      divisaoAtual = null
      blocos.push({ tipo: 'etapa', etapa, index })
      return
    }

    if (!grupoAtual || grupoAtual.nome !== meta.grupo) {
      grupoAtual = { tipo: 'grupo', nome: meta.grupo, divisoes: [] }
      blocos.push(grupoAtual)
      divisaoAtual = null
    }

    const divisaoNome = meta.divisao ?? 'Geral'
    if (divisaoAtual !== divisaoNome) {
      grupoAtual.divisoes.push({ nome: divisaoNome, etapas: [] })
      divisaoAtual = divisaoNome
    }

    const ultimaDivisao = grupoAtual.divisoes[grupoAtual.divisoes.length - 1]
    ultimaDivisao.etapas.push({ etapa, index })
  })

  return blocos
}
