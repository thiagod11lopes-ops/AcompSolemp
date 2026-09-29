import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { useProcessosArquivadosSetor } from '@/hooks/useProcessosArquivados'
import { ordenadorService } from '@/services/ordenadorService'
import {
  CHAVES_CONFECCAO_CADEIA,
  PERFIL_PARA_CHAVE_ETAPA,
  pedidoPendenteParaChave,
} from '@/utils/perfilEtapa'
import {
  setorNavItemsParaUsuario,
  userTemMultiSetorNav,
} from '@/utils/setorNav'
import { userHasPerfil, userTemCadeiaSolemp } from '@/utils/userPerfis'
import type { User, UserRole } from '@/types'

/** Resolve a chave de etapa da aba de setor (timeline). */
export function etapaChaveDaAbaSetor(item: {
  etapa?: string
  perfil?: UserRole
}): string | null {
  if (item.etapa) return item.etapa
  if (item.perfil) return PERFIL_PARA_CHAVE_ETAPA[item.perfil] ?? null
  return null
}

/** Chaves de etapa relevantes para sinos/contagem nas abas de timeline do usuário. */
export function etapasTimelineDoUsuario(user: User | null | undefined): string[] {
  if (!user) return []
  const fromNav = setorNavItemsParaUsuario(user)
    .map((item) => etapaChaveDaAbaSetor(item))
    .filter((chave): chave is string => Boolean(chave))

  if (fromNav.length > 0) {
    return [...new Set(fromNav)]
  }

  // Usuário com uma única aba "Timelines" (sem multi-setor).
  if (userTemCadeiaSolemp(user)) {
    return CHAVES_CONFECCAO_CADEIA.filter((c) => c !== 'DIV_MAT_EMPENHADO')
  }

  const chaves: string[] = []
  for (const perfil of user.perfis?.length ? user.perfis : [user.perfil]) {
    const chave = PERFIL_PARA_CHAVE_ETAPA[perfil]
    if (chave) chaves.push(chave)
  }
  if (userHasPerfil(user, 'FINANCEIRO') && !chaves.includes('DIV_MAT_FINANCAS')) {
    chaves.push('DIV_MAT_FINANCAS')
  }
  return [...new Set(chaves)]
}

/**
 * Contagem de cards pendentes na timeline por chave de etapa,
 * para todas as abas de timeline do usuário (uma ou várias).
 */
export function useContagemPendenciasSetores(user: User | null | undefined) {
  const multiSetor = Boolean(user && userTemMultiSetorNav(user))
  const etapasChaves = useMemo(() => etapasTimelineDoUsuario(user), [user])

  const { data: pedidos = [] } = useQuery({
    // Mesma chave de useOrdenadorPedidos para compartilhar cache.
    queryKey: ['ordenador-pedidos', user?.id],
    queryFn: () => ordenadorService.listTimelines(user!.id),
    enabled: Boolean(user?.id) && etapasChaves.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 8_000,
  })

  const { data: etapas = [] } = useWorkflowEtapas()
  const { data: processosArquivados = [] } = useProcessosArquivadosSetor(
    etapasChaves.length > 0 ? etapasChaves : null,
  )

  const contagemPorEtapa = useMemo(() => {
    const map: Record<string, number> = {}
    for (const chave of etapasChaves) {
      map[chave] = 0
    }
    if (etapasChaves.length === 0) return map

    for (const pedido of pedidos) {
      for (const chave of etapasChaves) {
        if (pedidoPendenteParaChave(pedido, etapas, chave, processosArquivados)) {
          map[chave] = (map[chave] ?? 0) + 1
        }
      }
    }
    return map
  }, [pedidos, etapas, processosArquivados, etapasChaves])

  const totalPendencias = useMemo(
    () => Object.values(contagemPorEtapa).reduce((acc, n) => acc + n, 0),
    [contagemPorEtapa],
  )

  return {
    enabled: etapasChaves.length > 0,
    multiSetor,
    etapasChaves,
    contagemPorEtapa,
    totalPendencias,
    contagemParaItem: (item: { etapa?: string; perfil?: UserRole }) => {
      const chave = etapaChaveDaAbaSetor(item)
      if (!chave) {
        // Aba única "Timelines" sem etapa: soma todas as pendências do usuário.
        return totalPendencias
      }
      return contagemPorEtapa[chave] ?? 0
    },
  }
}
