import type { WorkflowEtapa } from '@/types'

/** Metadados de agrupamento visual da timeline */
export const TIMELINE_ETAPA_META: Record<
  string,
  { grupo: string | null; divisao: string | null; trilha: string | null }
> = {
  SOLICITACAO: { grupo: null, divisao: null, trilha: null },
  // Div. de Material — trilha Auditoria/Contabilidade
  DIV_MAT_AUDITORIA: { grupo: 'Div. de Material', divisao: 'Material', trilha: 'auditoria' },
  DIV_MAT_CONTABILIDADE_IMH: {
    grupo: 'Div. de Material',
    divisao: 'Material',
    trilha: 'auditoria',
  },
  // Div. de Material — Confecção de Solemp
  DIV_MAT_CONFECCAO_SOLEMP: {
    grupo: 'Div. de Material',
    divisao: 'Material',
    trilha: 'confeccao',
  },
  // Timeline Finanças (separada do Material)
  DIV_MAT_ASSINATURA_1: { grupo: 'Finanças', divisao: 'Finanças', trilha: 'financas' },
  DIV_MAT_ASSINATURA_2: { grupo: 'Finanças', divisao: 'Finanças', trilha: 'financas' },
  DIV_MAT_SDA: { grupo: 'Finanças', divisao: 'Finanças', trilha: 'financas' },
  // Card próprio
  DIV_MAT_FINANCAS: {
    grupo: 'Finanças Pagamento',
    divisao: 'Finanças Pagamento',
    trilha: 'pagamento',
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

/** Confecção (Material) → Assinaturas/SDA (Finanças) → Pagamento */
export const DIVISAO_2_CHAVES = [
  'DIV_MAT_CONFECCAO_SOLEMP',
  'DIV_MAT_ASSINATURA_1',
  'DIV_MAT_ASSINATURA_2',
  'DIV_MAT_SDA',
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
  const ordenadas = [...etapas].filter((e) => e.ativo).sort((a, b) => a.ordem - b.ordem)
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

  // Em Div. de Material: Confecção à esquerda, Auditoria/Contabilidade à direita
  blocos.forEach((bloco) => {
    if (bloco.tipo === 'grupo' && bloco.nome === 'Div. de Material') {
      bloco.divisoes.reverse()
    }
  })

  return blocos
}
