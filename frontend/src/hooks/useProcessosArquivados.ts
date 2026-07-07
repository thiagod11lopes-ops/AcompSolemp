import { useQuery } from '@tanstack/react-query'
import { processoArquivadoService } from '@/services/processoArquivadoService'

export function useProcessosArquivadosSetor(etapaChave: string | null | undefined) {
  return useQuery({
    queryKey: ['processos-arquivados', etapaChave],
    queryFn: () => processoArquivadoService.listByEtapaChave(etapaChave!),
    enabled: Boolean(etapaChave),
  })
}

export function useProcessosArquivadosGestor() {
  return useQuery({
    queryKey: ['processos-arquivados', 'gestor'],
    queryFn: () => processoArquivadoService.listAll(),
  })
}
