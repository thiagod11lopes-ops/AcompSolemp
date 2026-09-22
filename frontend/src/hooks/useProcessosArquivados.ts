import { useQuery } from '@tanstack/react-query'
import { processoArquivadoService } from '@/services/processoArquivadoService'

export function useProcessosArquivadosSetor(
  etapaChave: string | string[] | null | undefined,
) {
  const chaves = Array.isArray(etapaChave)
    ? etapaChave
    : etapaChave
      ? [etapaChave]
      : []
  const key = chaves.join('|') || null

  return useQuery({
    queryKey: ['processos-arquivados', key],
    queryFn: () =>
      chaves.length === 1
        ? processoArquivadoService.listByEtapaChave(chaves[0])
        : processoArquivadoService.listByEtapaChaves(chaves),
    enabled: chaves.length > 0,
  })
}

export function useProcessosArquivadosGestor() {
  return useQuery({
    queryKey: ['processos-arquivados', 'gestor'],
    queryFn: () => processoArquivadoService.listAll(),
  })
}
