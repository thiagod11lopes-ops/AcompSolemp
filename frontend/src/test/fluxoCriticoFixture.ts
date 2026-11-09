import type { AppData, Pedido, User, WorkflowEtapa } from '@/types'
import { DEFAULT_WORKFLOW_ETAPAS } from '@/mocks/seed'

const agora = () => new Date().toISOString()

function buildEtapas(): WorkflowEtapa[] {
  return DEFAULT_WORKFLOW_ETAPAS.map((etapa, index) => ({
    ...etapa,
    id: `etapa-${etapa.chave.toLowerCase()}`,
    ordem: etapa.ordem ?? index + 1,
  }))
}

function user(
  id: string,
  nome: string,
  perfil: User['perfil'],
  clinicaId: string | null = null,
): User {
  return {
    id,
    nome,
    posto: 'CF',
    graduacao: 'CF',
    login: id,
    email: `${id}@marinha.mil.br`,
    perfil,
    clinicaId,
    ativo: true,
  }
}

export function etapaByChave(data: AppData, chave: string): WorkflowEtapa {
  const etapa = data.workflowEtapas.find((e) => e.chave === chave)
  if (!etapa) throw new Error(`Etapa ${chave} não encontrada no fixture`)
  return etapa
}

export function pedidoOf(data: AppData, pedidoId = 'ped-critico-1'): Pedido {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) throw new Error(`Pedido ${pedidoId} não encontrado`)
  return pedido
}

export function chavesAtivas(data: AppData, pedidoId = 'ped-critico-1'): string[] {
  const pedido = pedidoOf(data, pedidoId)
  return pedido.etapasAtivasIds
    .map((id) => data.workflowEtapas.find((e) => e.id === id)?.chave)
    .filter((c): c is string => Boolean(c))
}

export function historicoConcluido(
  data: AppData,
  chave: string,
  pedidoId = 'ped-critico-1',
): boolean {
  const etapa = etapaByChave(data, chave)
  const pedido = pedidoOf(data, pedidoId)
  return Boolean(
    pedido.etapasHistorico.find((h) => h.etapaId === etapa.id)?.dataConclusao,
  )
}

/**
 * AppData mínimo para exercitar o fluxo crítico OPME
 * (Clínica → Auditoria → IMH/Solemp → NE → Empenhado).
 */
export function createFluxoCriticoAppData(options?: {
  clinicaTipo?: 'clinica' | 'medicamento'
}): AppData {
  const etapas = buildEtapas()
  const solicitacao = etapas.find((e) => e.chave === 'SOLICITACAO')!
  const auditoria = etapas.find((e) => e.chave === 'DIV_MAT_AUDITORIA')!
  const clinicaTipo = options?.clinicaTipo ?? 'clinica'
  const now = agora()

  const usuarios: User[] = [
    user('u-clinica', 'Clínica Teste', 'CLINICA', 'cli-1'),
    user('u-medicamento', 'Medicamento Teste', 'MEDICAMENTO', 'cli-1'),
    user('u-auditoria', 'Cap. Auditoria', 'AUDITORIA'),
    user('u-imh', 'Ten. IMH', 'CONTABILIDADE_IMH'),
    user('u-solemp', 'Sgt. Solemp', 'CONFECCAO_SOLEMP'),
    user('u-fin', 'Ten. Finanças', 'FINANCEIRO'),
    user('u-gestor', 'Gestor Teste', 'GESTOR'),
  ]

  const pedido: Pedido = {
    id: 'ped-critico-1',
    numero: 'PED-TEST-0001',
    clinicaId: 'cli-1',
    empresaId: 'emp-1',
    materialId: 'mat-1',
    quantidade: 2,
    valor: 15_000,
    observacoes: 'Fixture fluxo crítico',
    paciente: null,
    dadosClinica: null,
    dataSolicitacao: now,
    dataEntrega: null,
    etapaAtualId: auditoria.id,
    etapasAtivasIds: [auditoria.id],
    responsavelAtualId: 'u-auditoria',
    concluido: false,
    etapasHistorico: [
      {
        etapaId: solicitacao.id,
        etapaNome: solicitacao.nome,
        responsavelId: 'u-clinica',
        responsavelNome: 'Clínica Teste',
        dataInicio: now,
        dataConclusao: now,
        observacao: 'Planilha enviada (fixture).',
        arquivos: [],
      },
      {
        etapaId: auditoria.id,
        etapaNome: auditoria.nome,
        responsavelId: 'u-auditoria',
        responsavelNome: 'Cap. Auditoria',
        dataInicio: now,
        dataConclusao: null,
        observacao: 'Aguardando Auditoria.',
        arquivos: [],
      },
    ],
  }

  return {
    clinicas: [
      {
        id: 'cli-1',
        nome: clinicaTipo === 'medicamento' ? 'PME Teste' : 'Clínica Teste',
        responsavel: 'Resp',
        telefone: '2100000000',
        tipo: clinicaTipo,
      },
    ],
    empresas: [
      {
        id: 'emp-1',
        razaoSocial: 'Empresa Teste LTDA',
        nomeFantasia: 'Empresa Teste',
        cnpj: '00.000.000/0001-00',
        contato: 'Contato',
        telefone: '2100000000',
        email: 'empresa@test.mil.br',
      },
    ],
    materiais: [
      {
        id: 'mat-1',
        descricao: 'Material teste',
        fabricante: 'Fab',
        unidade: 'UN',
      },
    ],
    usuarios,
    workflowEtapas: etapas,
    pedidos: [pedido],
    solemp: [],
    notasFiscais: [],
    historico: [],
    notificacoes: [],
    reversoes: [],
    auditoria: [],
    arquivos: [],
    credenciais: {},
    processosArquivados: [],
    pedidoPlanilhaEnvio: {
      'ped-critico-1': {
        formato: clinicaTipo === 'medicamento' ? 'imhMedicamento' : 'imh',
        cabecalho: {
          numeroRelacao: 'REL-TEST-1',
          pregaoTad: '',
          data: now.slice(0, 10),
          vigencia: '',
          processo: '',
          fornecedor: '',
        },
        linhas: [],
        enviadoEm: now,
      },
    },
  }
}

export function usersOf(data: AppData) {
  const byPerfil = (perfil: User['perfil']) => {
    const u = data.usuarios.find((item) => item.perfil === perfil)
    if (!u) throw new Error(`Usuário ${perfil} ausente no fixture`)
    return u
  }
  return {
    clinica: byPerfil('CLINICA'),
    auditoria: byPerfil('AUDITORIA'),
    imh: byPerfil('CONTABILIDADE_IMH'),
    solemp: byPerfil('CONFECCAO_SOLEMP'),
    financeiro: byPerfil('FINANCEIRO'),
  }
}
