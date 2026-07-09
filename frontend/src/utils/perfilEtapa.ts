import type { Pedido, ProcessoArquivado, UserRole, WorkflowEtapa } from '@/types'

/** Mapeia perfil cadastrado para a chave da etapa na timeline */
export const PERFIL_PARA_CHAVE_ETAPA: Partial<Record<UserRole, string>> = {
  AUDITORIA: 'DIV_MAT_AUDITORIA',
  CONTABILIDADE_IMH: 'DIV_MAT_CONTABILIDADE_IMH',
  CONFECCAO_SOLEMP: 'DIV_MAT_CONFECCAO_SOLEMP',
  FINANCEIRO: 'DIV_MAT_FINANCAS',
}

export const PERFIS_SOLEMP: UserRole[] = ['CONFECCAO_SOLEMP']

export const PERFIS_SETOR: UserRole[] = [
  'AUDITORIA',
  'CONTABILIDADE_IMH',
  'CONFECCAO_SOLEMP',
]

export function getHomeRouteForPerfil(perfil: UserRole): string {
  if (perfil === 'CLINICA') return '/clinica/timelines'
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

export function pedidoPendenteParaChave(
  pedido: Pedido,
  etapas: WorkflowEtapa[],
  chave: string,
  processosArquivados?: ProcessoArquivado[],
): boolean {
  if (pedido.concluido) return false

  if (
    processosArquivados?.some(
      (arquivo) => arquivo.pedidoId === pedido.id && arquivo.etapaChave === chave,
    )
  ) {
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
