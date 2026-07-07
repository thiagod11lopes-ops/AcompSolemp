import type {
  HistoricoEvento,
  Notification,
  ProcessoArquivado,
  ReversaoTimeline,
} from '@/types'
import type {
  ConsumoPlanilhaClinicaState,
  PedidoPlanilhaEnvioState,
} from '@/types'
import { loadAppData, saveAppData } from '@/mocks/seed'
import type {
  HistoricoRepository,
  NotificacaoRepository,
  PlanilhaRepository,
  ProcessoArquivadoRepository,
  ReversaoRepository,
} from '@/data/repositories/types'

export class LocalNotificacaoRepository implements NotificacaoRepository {
  async listAll(): Promise<Notification[]> {
    return loadAppData().notificacoes
  }

  async saveAll(notificacoes: Notification[]): Promise<void> {
    const data = loadAppData()
    data.notificacoes = notificacoes
    saveAppData(data)
  }
}

export class LocalHistoricoRepository implements HistoricoRepository {
  async listByPedido(pedidoId: string): Promise<HistoricoEvento[]> {
    return loadAppData().historico.filter((item) => item.pedidoId === pedidoId)
  }

  async append(evento: HistoricoEvento): Promise<void> {
    const data = loadAppData()
    data.historico.push(evento)
    saveAppData(data)
  }
}

export class LocalProcessoArquivadoRepository implements ProcessoArquivadoRepository {
  async listAll(): Promise<ProcessoArquivado[]> {
    return loadAppData().processosArquivados ?? []
  }

  async save(processo: ProcessoArquivado): Promise<void> {
    const data = loadAppData()
    if (!data.processosArquivados) data.processosArquivados = []
    data.processosArquivados.push(processo)
    saveAppData(data)
  }
}

export class LocalReversaoRepository implements ReversaoRepository {
  async listAll(): Promise<ReversaoTimeline[]> {
    return loadAppData().reversoes
  }

  async save(reversao: ReversaoTimeline): Promise<void> {
    const data = loadAppData()
    data.reversoes.push(reversao)
    saveAppData(data)
  }
}

export class LocalPlanilhaRepository implements PlanilhaRepository {
  async getConsumoState(clinicaId: string): Promise<ConsumoPlanilhaClinicaState | null> {
    return loadAppData().consumoPlanilha?.[clinicaId] ?? null
  }

  async saveConsumoState(clinicaId: string, state: ConsumoPlanilhaClinicaState): Promise<void> {
    const data = loadAppData()
    if (!data.consumoPlanilha) data.consumoPlanilha = {}
    data.consumoPlanilha[clinicaId] = state
    saveAppData(data)
  }

  async getPedidoPlanilhaEnvio(pedidoId: string): Promise<PedidoPlanilhaEnvioState | null> {
    return loadAppData().pedidoPlanilhaEnvio?.[pedidoId] ?? null
  }

  async savePedidoPlanilhaEnvio(
    pedidoId: string,
    state: PedidoPlanilhaEnvioState,
  ): Promise<void> {
    const data = loadAppData()
    if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}
    data.pedidoPlanilhaEnvio[pedidoId] = state
    saveAppData(data)
  }
}
