export type UserRole =
  | 'ADMINISTRADOR'
  | 'GESTOR'
  | 'CLINICA'
  | 'MEDICAMENTO'
  | 'EMPENHADO'
  | 'ASSINANTE'
  | 'FINANCEIRO'
  | 'AUDITORIA'
  | 'CONTABILIDADE_IMH'
  | 'CONFECCAO_SOLEMP'
  | 'ASSINATURA_1_SOLEMP'
  | 'ASSINATURA_2_SOLEMP'
  | 'SDA'
  | 'CONSULTA'

export type PrazoStatus = 'NO_PRAZO' | 'PROXIMO_VENCIMENTO' | 'ATRASADO'

export type NotificationType =
  | 'VENCENDO'
  | 'ATRASADO'
  | 'SOLEMP_CRIADA'
  | 'ASSINATURA_REALIZADA'
  | 'NF_ANEXADA'
  | 'PAGAMENTO_PENDENTE'
  | 'PAGAMENTO_REALIZADO'
  | 'REVERSAO_TIMELINE'
  | 'RESPOSTA_GESTOR'
  | 'ETAPA_PENDENTE'

export type ReversaoStatus = 'PENDENTE' | 'CIENTE' | 'RESPONDIDO'

export interface ReversaoTimeline {
  id: string
  pedidoId: string
  pedidoNumero: string
  clinicaNome: string
  etapaDeNome: string
  etapaParaNome: string
  motivo: string
  usuarioId: string
  usuarioNome: string
  data: string
  status: ReversaoStatus
  respostaGestor: string | null
  dataResposta: string | null
  gestorNome: string | null
}

export interface User {
  id: string
  nome: string
  posto: string
  graduacao: string
  login: string
  /** E-mail institucional @marinha.mil.br autorizado para login */
  email?: string | null
  perfil: UserRole
  clinicaId: string | null
  ativo: boolean
}

export interface Clinica {
  id: string
  nome: string
  responsavel: string
  telefone: string
  /** medicamento = envio direto Contabilidade/IMH; empenhado = portal clínica com NE no card */
  tipo?: 'clinica' | 'medicamento' | 'empenhado'
}

export interface Empresa {
  id: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  contato: string
  telefone: string
  email: string
}

export interface Material {
  id: string
  descricao: string
  fabricante: string
  unidade: string
}

export interface WorkflowEtapa {
  id: string
  chave: string
  nome: string
  ordem: number
  prazoDias: number
  perfilResponsavel: UserRole
  ativo: boolean
}

export interface HistoricoEvento {
  id: string
  pedidoId: string
  etapaId: string
  etapaNome: string
  usuarioId: string
  usuarioNome: string
  data: string
  observacao: string
}

export interface ArquivoAnexo {
  id: string
  pedidoId: string
  nome: string
  tipo: 'PDF' | 'SOLEMP' | 'NOTA_FISCAL' | 'DESPACHO' | 'OUTRO'
  dataUpload: string
  tamanhoKb: number
}

export interface Solemp {
  id: string
  numero: string
  pedidoId: string
  data: string
  assinada: boolean
  arquivoPDF: string | null
  /** Valor da SOLEMP informado na confecção */
  valor?: number
  /** Nome de quem registrou a Assinatura 1 */
  assinatura1Nome?: string
  /** Nome de quem registrou a Assinatura 2 */
  assinatura2Nome?: string
}

export interface NotaFiscal {
  id: string
  pedidoId: string
  numero: string
  serie: string
  valor: number
  arquivo: string | null
  dataEmissao: string
  /** Nome da empresa informado no pagamento */
  empresaNome?: string
}

export interface PedidoEtapaHistorico {
  etapaId: string
  etapaNome: string
  responsavelId: string | null
  responsavelNome: string | null
  dataInicio: string
  dataConclusao: string | null
  observacao: string
  arquivos: string[]
}

export type PacienteVinculo = 'TITULAR' | 'DEPENDENTE'

export type TipoUsuarioPaciente =
  | 'MILITAR'
  | 'MILITAR_DA_RESERVA'
  | 'MILITAR_RESERVADO'
  | 'DEPENDENTE_DIRETO'
  | 'DEPENDENTE_INDIRETO'
  | 'PENSIONISTA'

export interface PacientePedido {
  nome: string
  vinculo: PacienteVinculo
  nip: string
  nipTitular: string
  nomeTitular: string
  tipoUsuario: TipoUsuarioPaciente
}

export interface DadosClinicaLancamento {
  nomeClinica: string
  medico: string
  procedimento: string
  dataCirurgia: string
  empresaConsignada: string
  pregao: string
  materialUtilizado: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  folhaSala: string
  descricaoCirurgica: string
  etiquetas: string
  fotos: string[]
}

export interface Pedido {
  id: string
  numero: string
  clinicaId: string
  empresaId: string
  materialId: string
  quantidade: number
  valor: number
  observacoes: string
  paciente: PacientePedido | null
  dadosClinica: DadosClinicaLancamento | null
  dataSolicitacao: string
  dataEntrega: string | null
  /** Etapa principal (compatibilidade / listagens) */
  etapaAtualId: string
  /** Etapas ativas em paralelo (ex.: Auditoria e Assinatura 1 Solemp) */
  etapasAtivasIds: string[]
  responsavelAtualId: string | null
  concluido: boolean
  etapasHistorico: PedidoEtapaHistorico[]
  /** IDs das linhas da planilha de consumo incluídas neste envio (lote) */
  consumoRowIds?: string[]
  /**
   * Marcado em Solemp confeccionada via "Aguardando Empenhar".
   * Não avança para Empenhado — só aplica a tarja "Aguardando" no card.
   */
  aguardandoEmpenho?: boolean
  /** ISO da marcação aguardando empenho */
  aguardandoEmpenhoEm?: string
}

export interface Notification {
  id: string
  tipo: NotificationType
  titulo: string
  mensagem: string
  pedidoId: string | null
  reversaoId: string | null
  /** Perfil que deve receber a notificação (null = geral/gestor/clínica) */
  perfilDestino: UserRole | null
  etapaChave: string | null
  lida: boolean
  data: string
}

export interface PedidoFilters {
  clinicaId?: string
  empresaId?: string
  responsavelId?: string
  etapaId?: string
  status?: PrazoStatus | 'CONCLUIDO' | 'EM_ANDAMENTO'
  dataInicio?: string
  dataFim?: string
  valorMin?: number
  valorMax?: number
  materialId?: string
  busca?: string
}

export interface AguardandoEmpenhoItem {
  pedidoId: string
  pedidoNumero: string
  solempNumero: string
  valor: number
  setorTipo: 'clinica' | 'medicamento' | 'empenhado'
  setorLabel: string
  setorNome: string
  diasNaEtapa: number
  dataSolicitacao: string
}

/** Resumo de processo para modais de detalhe do dashboard */
export interface DashboardPedidoItem {
  pedidoId: string
  pedidoNumero: string
  clinicaNome: string
  empresaNome: string
  materialDescricao: string
  etapaAtual: string
  valor: number
  solempNumero: string | null
  prazoStatus: PrazoStatus
  diasNaEtapa: number
  diasRestantes: number
  dataSolicitacao: string
  concluido: boolean
  setorTipo: 'clinica' | 'medicamento' | 'empenhado'
  setorLabel: string
  setorNome: string
  /** Dias até conclusão (apenas processos concluídos) */
  diasAteConclusao?: number
}

export interface DashboardEmpenhadoItem {
  pedidoId: string
  pedidoNumero: string
  solempNumero: string | null
  empenhoNumero: string | null
  valor: number
  dataEmpenho: string
  mesChave: string
  mesLabel: string
  setorTipo: 'clinica' | 'medicamento' | 'empenhado'
  setorLabel: string
  setorNome: string
  clinicaNome: string
  empresaNome: string
  dataSolicitacao: string
}

export interface EmpenhadoMesTotal {
  /** Chave YYYY-MM */
  mesChave: string
  /** Ex.: Julho/2026 */
  mesLabel: string
  valor: number
  quantidade: number
}

export interface DashboardMetrics {
  totalProcessos: number
  emAndamento: number
  concluidos: number
  atrasados: number
  proximosVencimento: number
  tempoMedioPagamento: number
  tempoMedioPorEtapa: { etapa: string; dias: number }[]
  valorPagoMes: number
  quantidadePagoMes: number
  /** Solemps ativas só na etapa Solemp confeccionada (após Confecção) */
  valorAguardandoEmpenho: number
  quantidadeAguardandoEmpenho: number
  aguardandoEmpenhoItens: AguardandoEmpenhoItem[]
  /** Soma de todos os processos que concluíram Empenhado */
  valorTotalEmpenhado: number
  quantidadeTotalEmpenhado: number
  /** Data do primeiro empenho (ISO) */
  dataPrimeiroEmpenho: string | null
  /** Totais por mês (mais recente primeiro) */
  totaisEmpenhadoPorMes: EmpenhadoMesTotal[]
  /** Listas detalhadas para modais dos cards */
  todosItens: DashboardPedidoItem[]
  emAndamentoItens: DashboardPedidoItem[]
  concluidosItens: DashboardPedidoItem[]
  atrasadosItens: DashboardPedidoItem[]
  proximosVencimentoItens: DashboardPedidoItem[]
  pagoMesItens: DashboardPedidoItem[]
  empenhadoItens: DashboardEmpenhadoItem[]
  rankingClinicas: { nome: string; total: number; valor: number }[]
  rankingEmpresas: { nome: string; total: number; valor: number }[]
  rankingResponsaveis: { nome: string; total: number; atrasados: number }[]
  rankingGargalos: { etapa: string; mediaDias: number; atrasados: number }[]
  processosPorMes: { mes: string; total: number; concluidos: number }[]
  valorPorEtapa: { etapa: string; valor: number }[]
}

export interface PedidoComDetalhes extends Pedido {
  clinica: Clinica
  empresa: Empresa
  material: Material
  etapaAtual: WorkflowEtapa
  responsavelAtual: User | null
  prazoStatus: PrazoStatus
  diasNaEtapa: number
  diasRestantes: number
  solemp: Solemp | null
  notaFiscal: NotaFiscal | null
}

export interface AuthUser extends User {
  token: string
}

export interface LoginCredentials {
  login: string
  senha: string
}

export interface CredencialUsuario {
  senha: string
  userId: string
}

import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import type { ImhCabecalho, ImhLinha } from '@/utils/imhPlanilhaTemplate'

export interface ConsumoPlanilhaClinicaState {
  /** Legado — espelha finalizedAuditoriaRowIds ao salvar */
  finalizedRowIds: string[]
  finalizedAuditoriaRowIds?: string[]
  finalizedMaterialRowIds?: string[]
  extraRows: ConsumoMaterialRow[]
}

export interface PedidoPlanilhaEnvioState {
  cabecalho: ImhCabecalho
  linhas: ImhLinha[]
  enviadoEm: string
  recebidaEm?: string
  /** Planilha encaminhada pela Auditoria ao IMH */
  encaminhadaImhEm?: string
  /** Planilha recebida pela Contabilidade/IMH */
  recebidaImhEm?: string
  /** Planilha arquivada pela Contabilidade/IMH ao finalizar */
  arquivadaEm?: string
}

export interface ProcessoArquivado {
  id: string
  pedidoId: string
  pedidoNumero: string
  clinicaId: string
  clinicaNome: string
  etapaChave: string
  etapaNome: string
  arquivoNome: string
  concluidoEm: string
  concluidoPorUsuarioId: string
  concluidoPorNome: string
  observacao: string
  valor: number
  mensagemArquivamento: string
}

export interface TenantMeta {
  orgCode: string
  ownerEmail: string
  ownerUid: string
  createdAt: string
}

export interface AppData {
  usuarios: User[]
  clinicas: Clinica[]
  empresas: Empresa[]
  materiais: Material[]
  workflowEtapas: WorkflowEtapa[]
  pedidos: Pedido[]
  solemp: Solemp[]
  notasFiscais: NotaFiscal[]
  historico: HistoricoEvento[]
  arquivos: ArquivoAnexo[]
  notificacoes: Notification[]
  reversoes: ReversaoTimeline[]
  credenciais: Record<string, CredencialUsuario>
  consumoPlanilha?: Record<string, ConsumoPlanilhaClinicaState>
  /** Planilha editável da aba Preço de Medicamentos (persistida no IndexedDB). */
  medicamentosPrecos?: import('@/utils/medicamentosPrecos').MedicamentoPrecoRow[]
  pedidoPlanilhaEnvio?: Record<string, PedidoPlanilhaEnvioState>
  processosArquivados?: ProcessoArquivado[]
  /** Metadados da organização (multi-tenant) */
  tenantMeta?: TenantMeta
}
