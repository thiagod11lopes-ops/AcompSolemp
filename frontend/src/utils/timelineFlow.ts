import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'

/** Etapas retiradas do fluxo — não devem aparecer na timeline */
export const ETAPAS_REMOVIDAS = [
  'DIV_MAT_ASSINATURA_1',
  'DIV_MAT_ASSINATURA_2',
  'DIV_MAT_SDA',
] as const

export const ETAPAS_REMOVIDAS_SET = new Set<string>(ETAPAS_REMOVIDAS)

export function etapaVisivelNaTimeline(etapa: WorkflowEtapa): boolean {
  return etapa.ativo && !ETAPAS_REMOVIDAS_SET.has(etapa.chave)
}

export function filtrarEtapasParaTimeline(etapas: WorkflowEtapa[]): WorkflowEtapa[] {
  return [...etapas].filter(etapaVisivelNaTimeline).sort((a, b) => a.ordem - b.ordem)
}

/** Nome exibido no card da timeline (primeira etapa usa o nome da clínica). */
export function resolveEtapaNomeExibicao(
  etapa: WorkflowEtapa,
  pedido: Pick<PedidoComDetalhes, 'clinica'>,
): string {
  if (etapa.chave === 'SOLICITACAO') return pedido.clinica.nome
  return etapa.nome
}

/** Grupos da timeline cujo título de seção não deve aparecer (apenas os cards). */
export const TIMELINE_GRUPOS_TITULO_OCULTO = new Set(['Div. de Material'])

export function tituloGrupoOcultoNaTimeline(grupo: string): boolean {
  return TIMELINE_GRUPOS_TITULO_OCULTO.has(grupo)
}

/** Metadados de agrupamento visual da timeline */
export const TIMELINE_ETAPA_META: Record<
  string,
  { grupo: string | null; divisao: string | null; trilha: string | null }
> = {
  SOLICITACAO: { grupo: null, divisao: null, trilha: null },
  // Div. de Material — mesma coluna (trilha única)
  DIV_MAT_AUDITORIA: { grupo: 'Div. de Material', divisao: 'Material', trilha: 'material' },
  DIV_MAT_CONTABILIDADE_IMH: {
    grupo: 'Div. de Material',
    divisao: 'Material',
    trilha: 'material',
  },
  DIV_MAT_CONFECCAO_SOLEMP: {
    grupo: 'Div. de Material',
    divisao: 'Material',
    trilha: 'material',
  },
  DIV_MAT_FINANCAS: {
    grupo: 'Div. de Material',
    divisao: 'Material',
    trilha: 'material',
  },
}

/** Fluxos paralelos / sequenciais */
export const DIVISAO_1_CHAVES = ['DIV_MAT_AUDITORIA', 'DIV_MAT_CONTABILIDADE_IMH'] as const

/** Etapas visíveis para Auditoria e Contabilidade/IMH no portal ordenador */
export const ORDENADOR_TRILHA_AUDITORIA_CHAVES = [
  'SOLICITACAO',
  ...DIVISAO_1_CHAVES,
] as const

export function usaTrilhaAuditoriaOrdenador(chavePerfil: string | null | undefined): boolean {
  return chavePerfil === 'DIV_MAT_AUDITORIA' || chavePerfil === 'DIV_MAT_CONTABILIDADE_IMH'
}

export function filtrarEtapasTrilhaAuditoria(etapas: WorkflowEtapa[]): WorkflowEtapa[] {
  const permitidas = new Set<string>(ORDENADOR_TRILHA_AUDITORIA_CHAVES)
  return [...etapas]
    .filter((etapa) => permitidas.has(etapa.chave))
    .sort((a, b) => a.ordem - b.ordem)
}

/** Confecção (Material) → Finanças Pagamento */
export const DIVISAO_2_CHAVES = [
  'DIV_MAT_CONFECCAO_SOLEMP',
  'DIV_MAT_FINANCAS',
] as const

export function filtrarEtapasTrilhaConfeccao(etapas: WorkflowEtapa[]): WorkflowEtapa[] {
  const permitidas = new Set<string>(['SOLICITACAO', ...DIVISAO_2_CHAVES])
  return [...etapas]
    .filter((etapa) => permitidas.has(etapa.chave))
    .sort((a, b) => a.ordem - b.ordem)
}

export function usaTrilhaConfeccaoOrdenador(chavePerfil: string | null | undefined): boolean {
  return chavePerfil === 'DIV_MAT_CONFECCAO_SOLEMP'
}

export const DIV_MATERIAL_CHAVES = [...DIVISAO_1_CHAVES, ...DIVISAO_2_CHAVES] as const

export function timelineConnectorVisivel(fromChave: string, toChave: string): boolean {
  return (
    fromChave === 'DIV_MAT_AUDITORIA' && toChave === 'DIV_MAT_CONTABILIDADE_IMH'
  ) || (
    fromChave === 'DIV_MAT_CONFECCAO_SOLEMP' && toChave === 'DIV_MAT_FINANCAS'
  )
}

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
        trilha: string
        etapas: { etapa: WorkflowEtapa; index: number }[]
      }[]
    }

export function buildTimelineBlocos(etapas: WorkflowEtapa[]): TimelineBloco[] {
  const ordenadas = filtrarEtapasParaTimeline(etapas)
  const blocos: TimelineBloco[] = []
  let grupoAtual: Extract<TimelineBloco, { tipo: 'grupo' }> | null = null
  let trilhaAtual: string | null = null

  ordenadas.forEach((etapa, index) => {
    const meta = TIMELINE_ETAPA_META[etapa.chave] ?? {
      grupo: null,
      divisao: null,
      trilha: null,
    }

    if (!meta.grupo) {
      grupoAtual = null
      trilhaAtual = null
      blocos.push({ tipo: 'etapa', etapa, index })
      return
    }

    if (!grupoAtual || grupoAtual.nome !== meta.grupo) {
      grupoAtual = { tipo: 'grupo', nome: meta.grupo, divisoes: [] }
      blocos.push(grupoAtual)
      trilhaAtual = null
    }

    const trilhaKey = meta.trilha ?? meta.divisao ?? 'geral'
    const divisaoNome = meta.divisao ?? 'Geral'

    if (trilhaAtual !== trilhaKey) {
      grupoAtual.divisoes.push({ nome: divisaoNome, trilha: trilhaKey, etapas: [] })
      trilhaAtual = trilhaKey
    }

    const ultimaDivisao = grupoAtual.divisoes[grupoAtual.divisoes.length - 1]
    ultimaDivisao.etapas.push({ etapa, index })
  })

  return blocos
}
