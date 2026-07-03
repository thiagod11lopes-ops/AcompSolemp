import type { ReversaoTimeline } from '@/types'
import { delay, loadAppData, saveAppData } from '@/mocks/seed'

export const reversaoService = {
  async list(): Promise<ReversaoTimeline[]> {
    await delay(null)
    const data = loadAppData()
    return [...(data.reversoes ?? [])].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    )
  },

  async listPendentes(): Promise<ReversaoTimeline[]> {
    const all = await this.list()
    return all.filter((r) => r.status === 'PENDENTE')
  },

  async marcarCiente(reversaoId: string, _gestorId: string, gestorNome: string): Promise<void> {
    await delay(null, 300)
    const data = loadAppData()
    const rev = data.reversoes?.find((r) => r.id === reversaoId)
    if (!rev) throw new Error('Reversão não encontrada')

    rev.status = 'CIENTE'
    rev.gestorNome = gestorNome
    rev.dataResposta = new Date().toISOString()
    rev.respostaGestor = 'Situação compreendida pelo gestor.'

    data.notificacoes.push({
      id: `notif-${Date.now()}`,
      tipo: 'RESPOSTA_GESTOR',
      titulo: `Gestor ciente — ${rev.pedidoNumero}`,
      mensagem: `O gestor ${gestorNome} registrou ciência da reversão de etapa.`,
      pedidoId: rev.pedidoId,
      reversaoId: rev.id,
      lida: false,
      data: new Date().toISOString(),
    })

    saveAppData(data)
  },

  async responder(
    reversaoId: string,
    _gestorId: string,
    gestorNome: string,
    resposta: string,
  ): Promise<void> {
    await delay(null, 300)
    const data = loadAppData()
    const rev = data.reversoes?.find((r) => r.id === reversaoId)
    if (!rev) throw new Error('Reversão não encontrada')

    rev.status = 'RESPONDIDO'
    rev.gestorNome = gestorNome
    rev.dataResposta = new Date().toISOString()
    rev.respostaGestor = resposta

    data.notificacoes.push({
      id: `notif-${Date.now()}`,
      tipo: 'RESPOSTA_GESTOR',
      titulo: `Resposta do gestor — ${rev.pedidoNumero}`,
      mensagem: resposta,
      pedidoId: rev.pedidoId,
      reversaoId: rev.id,
      lida: false,
      data: new Date().toISOString(),
    })

    saveAppData(data)
  },
}

export type { ReversaoTimeline }
