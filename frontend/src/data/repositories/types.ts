import type {
  AppData,
  Clinica,
  ConsumoPlanilhaClinicaState,
  Empresa,
  HistoricoEvento,
  Material,
  Notification,
  Pedido,
  PedidoPlanilhaEnvioState,
  ProcessoArquivado,
  ReversaoTimeline,
  User,
  WorkflowEtapa,
} from '@/types'

/** Contrato base — fase 2 migrará serviços para repositórios por coleção */
export interface AppDataRepository {
  load(): AppData
  save(data: AppData): void
  reload(): AppData
}

export interface PedidoRepository {
  listAll(): Promise<Pedido[]>
  getById(id: string): Promise<Pedido | null>
  save(pedido: Pedido): Promise<void>
}

export interface CadastroRepository {
  listClinicas(): Promise<Clinica[]>
  listEmpresas(): Promise<Empresa[]>
  listMateriais(): Promise<Material[]>
  listUsuarios(): Promise<User[]>
  listWorkflowEtapas(): Promise<WorkflowEtapa[]>
}

export interface NotificacaoRepository {
  listAll(): Promise<Notification[]>
  saveAll(notificacoes: Notification[]): Promise<void>
}

export interface HistoricoRepository {
  listByPedido(pedidoId: string): Promise<HistoricoEvento[]>
  append(evento: HistoricoEvento): Promise<void>
}

export interface ProcessoArquivadoRepository {
  listAll(): Promise<ProcessoArquivado[]>
  save(processo: ProcessoArquivado): Promise<void>
}

export interface ReversaoRepository {
  listAll(): Promise<ReversaoTimeline[]>
  save(reversao: ReversaoTimeline): Promise<void>
}

export interface PlanilhaRepository {
  getConsumoState(clinicaId: string): Promise<ConsumoPlanilhaClinicaState | null>
  saveConsumoState(clinicaId: string, state: ConsumoPlanilhaClinicaState): Promise<void>
  getPedidoPlanilhaEnvio(pedidoId: string): Promise<PedidoPlanilhaEnvioState | null>
  savePedidoPlanilhaEnvio(pedidoId: string, state: PedidoPlanilhaEnvioState): Promise<void>
}

export interface Repositories {
  appData: AppDataRepository
  pedidos: PedidoRepository
  cadastros: CadastroRepository
  notificacoes: NotificacaoRepository
  historico: HistoricoRepository
  processosArquivados: ProcessoArquivadoRepository
  reversoes: ReversaoRepository
  planilhas: PlanilhaRepository
}
