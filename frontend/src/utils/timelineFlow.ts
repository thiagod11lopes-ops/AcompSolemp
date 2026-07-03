import type { WorkflowEtapa } from '@/types'

/** Metadados de agrupamento visual da timeline */
export const TIMELINE_ETAPA_META: Record<
  string,
  { grupo: string | null; divisao: string | null }
> = {
  SOLICITACAO: { grupo: null, divisao: null },
  DIV_MAT_AUDITORIA: { grupo: 'Div. de Material', divisao: 'Divisão 1' },
  DIV_MAT_CONTABILIDADE_IMH: { grupo: 'Div. de Material', divisao: 'Divisão 1' },
  DIV_MAT_ASSINATURA_1: { grupo: 'Div. de Material', divisao: 'Divisão 2' },
  DIV_MAT_ASSINATURA_2: { grupo: 'Div. de Material', divisao: 'Divisão 2' },
  DIV_MAT_SDA: { grupo: 'Div. de Material', divisao: 'Divisão 2' },
  DIV_MAT_FINANCAS: { grupo: 'Div. de Material', divisao: 'Divisão 2' },
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
