import type { Pedido, ProcessoArquivado, UserRole, WorkflowEtapa } from '@/types'

/** Mapeia perfil cadastrado para a chave principal da etapa na timeline */
export const PERFIL_PARA_CHAVE_ETAPA: Partial<Record<UserRole, string>> = {
  AUDITORIA: 'DIV_MAT_AUDITORIA',
  CONTABILIDADE_IMH: 'DIV_MAT_CONTABILIDADE_IMH',
  CONFECCAO_SOLEMP: 'DIV_MAT_CONFECCAO_SOLEMP',
  FINANCEIRO: 'DIV_MAT_FINANCAS',
}

/** Cadeia Solemp sob responsabilidade da Confecção (receber/enviar planilha). */
export const CHAVES_CONFECCAO_CADEIA = [
  'DIV_MAT_CONFECCAO_SOLEMP',
  'DIV_MAT_FINANCAS',
  'DIV_MAT_EMPENHADO',
] as const

export type ChaveConfeccaoCadeia = (typeof CHAVES_CONFECCAO_CADEIA)[number]

export const PERFIS_SOLEMP: UserRole[] = ['CONFECCAO_SOLEMP']

export const PERFIS_SETOR: UserRole[] = [
  'AUDITORIA',
  'CONTABILIDADE_IMH',
  'CONFECCAO_SOLEMP',
]

/** Etapas acionáveis pelos tipos autorizados (perfis[]); cadeia se Confecção + Rascunho. */
export function chavesEtapaParaPerfil(
  perfil: UserRole,
  user?: Pick<{ perfil: UserRole; perfis?: UserRole[] }, 'perfil' | 'perfis'>,
): string[] {
  const perfis = user ? (user.perfis?.length ? user.perfis : [user.perfil]) : [perfil]
  const temConfeccao = perfis.includes('CONFECCAO_SOLEMP')
  const temFinanceiro = perfis.includes('FINANCEIRO')
  const chaves = new Set<string>()

  // União de todas as etapas dos setores cadastrados no mesmo usuário.
  for (const p of perfis) {
    if (p === 'CONFECCAO_SOLEMP' && temConfeccao && temFinanceiro) {
      for (const c of CHAVES_CONFECCAO_CADEIA) chaves.add(c)
      continue
    }
    if (p === 'CONFECCAO_SOLEMP') {
      chaves.add('DIV_MAT_CONFECCAO_SOLEMP')
      continue
    }
    if (p === 'FINANCEIRO') {
      if (temConfeccao && temFinanceiro) {
        for (const c of CHAVES_CONFECCAO_CADEIA) chaves.add(c)
      } else {
        chaves.add('DIV_MAT_FINANCAS')
        chaves.add('DIV_MAT_EMPENHADO')
      }
      continue
    }
    const chave = PERFIL_PARA_CHAVE_ETAPA[p]
    if (chave) chaves.add(chave)
  }

  if (chaves.size > 0) return [...chaves]

  // Fallback: só o perfil ativo (usuário sem perfis[] / papel legado).
  if (perfil === 'CONFECCAO_SOLEMP') return ['DIV_MAT_CONFECCAO_SOLEMP']
  if (perfil === 'FINANCEIRO') return ['DIV_MAT_FINANCAS', 'DIV_MAT_EMPENHADO']
  const chave = PERFIL_PARA_CHAVE_ETAPA[perfil]
  return chave ? [chave] : []
}

export function pedidoPendenteParaPerfil(
  pedido: Pedido,
  etapas: WorkflowEtapa[],
  perfil: UserRole,
  processosArquivados?: ProcessoArquivado[],
  user?: Pick<{ perfil: UserRole; perfis?: UserRole[] }, 'perfil' | 'perfis'>,
): boolean {
  return chavesEtapaParaPerfil(perfil, user).some((chave) =>
    pedidoPendenteParaChave(pedido, etapas, chave, processosArquivados),
  )
}

export function pedidoRelacionadoParaPerfil(
  pedido: Pedido,
  etapas: WorkflowEtapa[],
  perfil: UserRole,
  processosArquivados?: ProcessoArquivado[],
  user?: Pick<{ perfil: UserRole; perfis?: UserRole[] }, 'perfil' | 'perfis'>,
): boolean {
  return chavesEtapaParaPerfil(perfil, user).some((chave) =>
    pedidoRelacionadoParaChave(pedido, etapas, chave, processosArquivados),
  )
}

/** Etapa pendente atual dentro das chaves do perfil (ordem da cadeia). */
export function chavePendenteParaPerfil(
  pedido: Pedido,
  etapas: WorkflowEtapa[],
  perfil: UserRole,
  processosArquivados?: ProcessoArquivado[],
  user?: Pick<{ perfil: UserRole; perfis?: UserRole[] }, 'perfil' | 'perfis'>,
): string | null {
  for (const chave of chavesEtapaParaPerfil(perfil, user)) {
    if (pedidoPendenteParaChave(pedido, etapas, chave, processosArquivados)) {
      return chave
    }
  }
  return null
}

export function getHomeRouteForPerfil(perfil: UserRole): string {
  if (perfil === 'CLINICA' || perfil === 'MEDICAMENTO' || perfil === 'EMPENHADO') return '/clinica/timelines'
  if (perfil === 'FINANCEIRO') return '/financeiro/pagamentos'
  if (PERFIS_SETOR.includes(perfil)) return '/ordenador/timelines'
  return '/login'
}

export function getDemoHomeRouteForPerfil(perfil: UserRole): string {
  return `/gestor/demo${getHomeRouteForPerfil(perfil)}`
}

export function getEtapasAtivasIds(pedido: Pedido): string[] {
  if (pedido.etapasAtivasIds?.length) return pedido.etapasAtivasIds
  return pedido.etapaAtualId ? [pedido.etapaAtualId] : []
}

export function pedidoEtapaConcluidaParaChave(
  pedido: Pedido,
  etapas: WorkflowEtapa[],
  chave: string,
  processosArquivados?: ProcessoArquivado[],
): boolean {
  if (
    processosArquivados?.some(
      (arquivo) => arquivo.pedidoId === pedido.id && arquivo.etapaChave === chave,
    )
  ) {
    return true
  }

  const etapaAlvo = etapas.find((item) => item.chave === chave)
  if (!etapaAlvo) return false

  return pedido.etapasHistorico.some((historico) => {
    if (!historico.dataConclusao) return false
    const etapa = etapas.find((item) => item.id === historico.etapaId)
    if (etapa?.chave === chave) return true
    return historico.etapaNome === etapaAlvo.nome
  })
}

export function pedidoPendenteParaChave(
  pedido: Pedido,
  etapas: WorkflowEtapa[],
  chave: string,
  processosArquivados?: ProcessoArquivado[],
): boolean {
  if (pedido.concluido) return false

  if (pedidoEtapaConcluidaParaChave(pedido, etapas, chave, processosArquivados)) {
    return false
  }

  const etapaAlvo = etapas.find((item) => item.chave === chave)
  if (!etapaAlvo) return false

  const ativasIds = getEtapasAtivasIds(pedido)
  const ativaPorIds = ativasIds.some((id) => {
    const etapa = etapas.find((item) => item.id === id)
    return etapa?.chave === chave
  })

  const ativaPorHistorico = pedido.etapasHistorico.some((historico) => {
    if (historico.dataConclusao) return false
    const etapa = etapas.find((item) => item.id === historico.etapaId)
    if (etapa?.chave === chave) return true
    return historico.etapaNome === etapaAlvo.nome
  })

  return ativaPorIds || pedido.etapaAtualId === etapaAlvo.id || ativaPorHistorico
}

/** Pedido pendente ou já tratado pelo setor (para abas Em andamento / Todas / Concluídas). */
export function pedidoRelacionadoParaChave(
  pedido: Pedido,
  etapas: WorkflowEtapa[],
  chave: string,
  processosArquivados?: ProcessoArquivado[],
): boolean {
  return (
    pedidoPendenteParaChave(pedido, etapas, chave, processosArquivados) ||
    pedidoEtapaConcluidaParaChave(pedido, etapas, chave, processosArquivados)
  )
}
