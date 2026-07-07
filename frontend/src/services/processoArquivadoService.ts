import { delay, loadAppData } from '@/mocks/seed'
import type { ProcessoArquivado } from '@/types'

export const processoArquivadoService = {
  async listByEtapaChave(etapaChave: string): Promise<ProcessoArquivado[]> {
    await delay(null)
    const data = loadAppData()
    return (data.processosArquivados ?? [])
      .filter((item) => item.etapaChave === etapaChave)
      .sort((a, b) => new Date(b.concluidoEm).getTime() - new Date(a.concluidoEm).getTime())
  },

  async listAll(): Promise<ProcessoArquivado[]> {
    await delay(null)
    const data = loadAppData()
    return [...(data.processosArquivados ?? [])].sort(
      (a, b) => new Date(b.concluidoEm).getTime() - new Date(a.concluidoEm).getTime(),
    )
  },

  async getByPedidoAndEtapa(
    pedidoId: string,
    etapaChave: string,
  ): Promise<ProcessoArquivado | null> {
    await delay(null)
    const data = loadAppData()
    return (
      data.processosArquivados?.find(
        (item) => item.pedidoId === pedidoId && item.etapaChave === etapaChave,
      ) ?? null
    )
  },
}
