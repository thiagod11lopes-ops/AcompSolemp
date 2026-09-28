import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { useProcessosArquivadosSetor } from '@/hooks/useProcessosArquivados'
import { ordenadorService } from '@/services/ordenadorService'
import { PERFIL_PARA_CHAVE_ETAPA, pedidoPendenteParaChave } from '@/utils/perfilEtapa'
import {
  setorNavItemsParaUsuario,
  userTemMultiSetorNav,
} from '@/utils/setorNav'
import type { User } from '@/types'

/** Resolve a chave de etapa da aba de setor (timeline). */
export function etapaChaveDaAbaSetor(item: {
  etapa?: string
  perfil?: User['perfil']
}): string | null {
  if (item.etapa) return item.etapa
  if (item.perfil) return PERFIL_PARA_CHAVE_ETAPA[item.perfil] ?? null
  return null
}

/**
 * Contagem de cards pendentes na timeline por chave de etapa,
 * para usuários com mais de uma aba de setor.
 */
export function useContagemPendenciasSetores(user: User | null | undefined) {
  const multiSetor = Boolean(user && userTemMultiSetorNav(user))
  const itens = useMemo(
    () => (user && multiSetor ? setorNavItemsParaUsuario(user) : []),
    [user, multiSetor],
  )
  const etapasChaves = useMemo(
    () =>
      [...new Set(itens.map((item) => etapaChaveDaAbaSetor(item)).filter(Boolean))] as string[],
    [itens],
  )

  const { data: pedidos = [] } = useQuery({
    // Mesma chave de useOrdenadorPedidos para compartilhar cache.
    queryKey: ['ordenador-pedidos', user?.id],
    queryFn: () => ordenadorService.listTimelines(user!.id),
    enabled: multiSetor && Boolean(user?.id),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 8_000,
  })

  const { data: etapas = [] } = useWorkflowEtapas()
  const { data: processosArquivados = [] } = useProcessosArquivadosSetor(
    multiSetor ? etapasChaves : null,
  )

  const contagemPorEtapa = useMemo(() => {
    const map: Record<string, number> = {}
    for (const chave of etapasChaves) {
      map[chave] = 0
    }
    if (!multiSetor || etapasChaves.length === 0) return map

    for (const pedido of pedidos) {
      for (const chave of etapasChaves) {
        if (pedidoPendenteParaChave(pedido, etapas, chave, processosArquivados)) {
          map[chave] = (map[chave] ?? 0) + 1
        }
      }
    }
    return map
  }, [pedidos, etapas, processosArquivados, etapasChaves, multiSetor])

  return {
    enabled: multiSetor,
    contagemPorEtapa,
    contagemParaItem: (item: { etapa?: string; perfil?: User['perfil'] }) => {
      const chave = etapaChaveDaAbaSetor(item)
      if (!chave) return 0
      return contagemPorEtapa[chave] ?? 0
    },
  }
}
