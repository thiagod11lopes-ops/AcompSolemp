export type UserRole =
  | 'ADMINISTRADOR'
  | 'GESTOR'
  | 'CLINICA'
  | 'ASSINANTE'
  | 'FINANCEIRO'
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
  perfil: UserRole
  clinicaId: string | null
  ativo: boolean
}

export interface Clinica {
  id: string
  nome: string
  responsavel: string
  telefone: string
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
}

export interface NotaFiscal {
  id: string
  pedidoId: string
  numero: string
  serie: string
  valor: number
  arquivo: string | null
  dataEmissao: string
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

export interface Pedido {
  id: string
  numero: string
  clinicaId: string
  empresaId: string
  materialId: string
  quantidade: number
  valor: number
  observacoes: string
  dataSolicitacao: string
  dataEntrega: string | null
  etapaAtualId: string
  responsavelAtualId: string | null
  concluido: boolean
  etapasHistorico: PedidoEtapaHistorico[]
}

export interface Notification {
  id: string
  tipo: NotificationType
  titulo: string
  mensagem: string
  pedidoId: string | null
  reversaoId: string | null
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

export interface DashboardMetrics {
  totalProcessos: number
  emAndamento: number
  concluidos: number
  atrasados: number
  proximosVencimento: number
  tempoMedioPagamento: number
  tempoMedioPorEtapa: { etapa: string; dias: number }[]
  valorTotalAberto: number
  valorPagoMes: number
  valorAguardandoAssinatura: number
  valorAguardandoFinanceiro: number
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
}
