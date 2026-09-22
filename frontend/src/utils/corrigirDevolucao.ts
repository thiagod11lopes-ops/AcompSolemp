import type { AuthUser, PedidoComDetalhes, PedidoPlanilhaEnvioState } from '@/types'
import type { TimelineNodeData } from '@/components/timeline/types'
import { chavesEtapaParaPerfil } from '@/utils/perfilEtapa'

const SETORES_ORDENADOR = new Set([
  'DIV_MAT_AUDITORIA',
  'DIV_MAT_CONFECCAO_SOLEMP',
  'DIV_MAT_CONTABILIDADE_IMH',
  'DIV_MAT_FINANCAS',
  'DIV_MAT_EMPENHADO',
])

export function buildCorrigirDevolucaoPath(
  pedido: Pick<PedidoComDetalhes, 'id' | 'planilhaDevolvidaParaChave' | 'clinica'>,
  _planilha: PedidoPlanilhaEnvioState | null,
): string | null {
  const destino = pedido.planilhaDevolvidaParaChave
  if (!destino) return null

  if (destino === 'SOLICITACAO') {
    return `/clinica/pedidos/novo?corrigir=${encodeURIComponent(pedido.id)}&aba=${encodeURIComponent('imh')}`
  }

  if (SETORES_ORDENADOR.has(destino)) {
    return `/ordenador/timelines/${encodeURIComponent(pedido.id)}?planilha=1`
  }

  return null
}

export function usuarioPodeCorrigirDevolucao(
  pedido: Pick<PedidoComDetalhes, 'planilhaDevolvidaParaChave'>,
  node: Pick<TimelineNodeData, 'statusBand' | 'etapa'>,
  user: AuthUser | null | undefined,
): boolean {
  if (!user || node.statusBand !== 'devolvido') return false
  const destino = pedido.planilhaDevolvidaParaChave
  if (!destino || destino !== node.etapa.chave) return false

  if (destino === 'SOLICITACAO') {
    return user.perfil === 'CLINICA' || user.perfil === 'MEDICAMENTO'
  }

  if (SETORES_ORDENADOR.has(destino)) {
    return chavesEtapaParaPerfil(user.perfil).includes(destino)
  }

  return false
}
