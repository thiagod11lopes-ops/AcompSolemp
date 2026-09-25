import type {
  AuthUser,
  Pedido,
  PedidoComDetalhes,
  PedidoPlanilhaEnvioState,
} from '@/types'
import type { TimelineNodeData } from '@/components/timeline/types'
import { chavesEtapaParaPerfil } from '@/utils/perfilEtapa'

const SETORES_ORDENADOR = new Set([
  'DIV_MAT_AUDITORIA',
  'DIV_MAT_CONFECCAO_SOLEMP',
  'DIV_MAT_CONTABILIDADE_IMH',
  'DIV_MAT_FINANCAS',
  'DIV_MAT_EMPENHADO',
])

export type CorrigirPlanilhaAba = 'imh' | 'div-material'

/** IDs das linhas que foram enviadas neste pedido (para filtrar a tela Corrigir). */
export function resolveCorrigirLinhaIds(
  pedido: Pick<Pedido, 'consumoRowIds' | 'id'>,
  planilha: PedidoPlanilhaEnvioState | null | undefined,
): Set<string> {
  const ids = new Set<string>()
  for (const id of pedido.consumoRowIds ?? []) {
    if (id) ids.add(id)
  }
  for (const linha of planilha?.divMaterialLinhas ?? []) {
    if (linha.id) ids.add(linha.id)
  }
  for (const linha of planilha?.imhAbaLinhas ?? []) {
    if (linha.id) ids.add(linha.id)
  }
  for (const linha of planilha?.imhMedicamentoLinhas ?? []) {
    if (linha.id) ids.add(linha.id)
  }
  // Snapshot IMH OPME legado: id da linha da aba está em pacienteGrupoId
  for (const linha of planilha?.linhas ?? []) {
    const rowId = linha.pacienteGrupoId || linha.id
    if (rowId) ids.add(rowId)
  }
  return ids
}

/** Mescla edições da tela Corrigir (só linhas enviadas) de volta na planilha completa. */
export function mergeLinhasCorrigir<T extends { id: string }>(
  full: T[],
  edited: T[],
  allowedIds: Set<string>,
): T[] {
  const editedMap = new Map(edited.map((linha) => [linha.id, linha]))
  const keptAllowed = new Set(edited.map((linha) => linha.id))
  const result: T[] = []
  for (const linha of full) {
    if (!allowedIds.has(linha.id)) {
      result.push(linha)
      continue
    }
    if (!keptAllowed.has(linha.id)) continue
    result.push(editedMap.get(linha.id) ?? linha)
  }
  return result
}

export function resolveCorrigirAbaPreferida(
  planilha: PedidoPlanilhaEnvioState | null | undefined,
  linhaIds: Set<string>,
): CorrigirPlanilhaAba {
  const hasDiv = (planilha?.divMaterialLinhas ?? []).some((l) => linhaIds.has(l.id))
  const hasImhAba =
    (planilha?.imhAbaLinhas ?? []).some((l) => linhaIds.has(l.id)) ||
    (planilha?.linhas ?? []).some((l) => linhaIds.has(l.pacienteGrupoId || l.id))
  const hasImhMed = (planilha?.imhMedicamentoLinhas ?? []).some((l) => linhaIds.has(l.id))

  if (hasDiv && !hasImhAba && !hasImhMed) return 'div-material'
  return 'imh'
}

export function buildCorrigirDevolucaoPath(
  pedido: Pick<PedidoComDetalhes, 'id' | 'planilhaDevolvidaParaChave' | 'clinica' | 'consumoRowIds'>,
  planilha: PedidoPlanilhaEnvioState | null,
): string | null {
  const destino = pedido.planilhaDevolvidaParaChave
  if (!destino) return null

  if (destino === 'SOLICITACAO') {
    const linhaIds = resolveCorrigirLinhaIds(pedido, planilha)
    const aba = resolveCorrigirAbaPreferida(planilha, linhaIds)
    return `/clinica/pedidos/novo?corrigir=${encodeURIComponent(pedido.id)}&aba=${encodeURIComponent(aba)}`
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
    return chavesEtapaParaPerfil(user.perfil, user).includes(destino)
  }

  return false
}
