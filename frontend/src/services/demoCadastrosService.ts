import type { Clinica, User } from '@/types'
import { CADASTRO_PERFIS, type CadastroPerfilOpcao } from '@/types/cadastroPerfis'
import { isDemoDataSession } from '@/config/dataSource'
import {
  clearAppDataCache,
  loadAppData,
  reloadAppDataFromStorage,
  saveAppData,
} from '@/mocks/seed'
import { createDemoMedicamentoPlanilhaExemploState, createDemoPlanilhaExemploState } from '@/utils/consumoMaterialTemplate'
import { ensureUniqueLogin, slugLogin } from '@/utils/loginSlug'

export const DEMO_EXEMPLO_USER_PREFIX = 'demo-exemplo-'
export const DEMO_CLINICA_EXEMPLO_ID = 'demo-clinica-exemplo'
export const DEMO_MEDICAMENTO_EXEMPLO_ID = 'demo-medicamento-exemplo'
export const DEMO_EMPENHADO_EXEMPLO_ID = 'demo-empenhado-exemplo'
export const DEMO_GESTOR_OVERVIEW_USER_ID = '__gestor_demo_overview__'

const DEMO_NOMES: Record<string, string> = {
  clinica: 'Clínica Exemplo',
  medicamento: 'Medicamento Exemplo',
  auditoria: 'Cap. Ana Paula',
  contabilidade: 'Ten. Roberto Lima',
  confeccao: 'Sgt. Maria Souza',
  financas: 'Ten. Santos', // demo Solemp confeccionada (perfil FINANCEIRO)
  empenhado: 'Empenhado',
}

export interface DemoCadastroItem {
  id: string
  userId: string
  label: string
  nome: string
  subtitulo: string
  isExemplo: boolean
}

export function formatDemoTabTitle(item: Pick<DemoCadastroItem, 'label' | 'nome'>): string {
  return `${item.label} — ${item.nome} | AcompSolemp`
}

function demoExampleUserId(opcaoId: string, entidadeId?: string): string {
  if ((opcaoId === 'clinica' || opcaoId === 'medicamento' || opcaoId === 'empenhado') && entidadeId) {
    return `${DEMO_EXEMPLO_USER_PREFIX}${opcaoId}-${entidadeId}`
  }
  return `${DEMO_EXEMPLO_USER_PREFIX}${opcaoId}`
}

export function isDemoExampleUser(user: User): boolean {
  return user.id.startsWith(DEMO_EXEMPLO_USER_PREFIX)
}

function getExistingLogins(data: ReturnType<typeof loadAppData>): Set<string> {
  const logins = new Set<string>()
  data.usuarios.forEach((user) => logins.add(user.login))
  return logins
}

function createExampleClinicaUser(clinica: Clinica, data: ReturnType<typeof loadAppData>): User {
  const logins = getExistingLogins(data)
  const login = ensureUniqueLogin(slugLogin(`demo-${clinica.nome}`), logins)
  return {
    id: demoExampleUserId('clinica', clinica.id),
    nome: clinica.nome,
    posto: '',
    graduacao: 'Clínica',
    login,
    perfil: 'CLINICA',
    clinicaId: clinica.id,
    ativo: true,
  }
}

function createExampleMedicamentoUser(
  medicamento: Clinica,
  data: ReturnType<typeof loadAppData>,
): User {
  const logins = getExistingLogins(data)
  const login = ensureUniqueLogin(slugLogin(`demo-${medicamento.nome}`), logins)
  return {
    id: demoExampleUserId('medicamento', medicamento.id),
    nome: medicamento.nome,
    posto: '',
    graduacao: 'Medicamento',
    login,
    perfil: 'MEDICAMENTO',
    clinicaId: medicamento.id,
    ativo: true,
  }
}

function createExampleSetorUser(opcao: CadastroPerfilOpcao, data: ReturnType<typeof loadAppData>): User {
  const logins = getExistingLogins(data)
  const login = ensureUniqueLogin(slugLogin(`demo-${opcao.id}`), logins)
  return {
    id: demoExampleUserId(opcao.id),
    nome: DEMO_NOMES[opcao.id] ?? opcao.label,
    posto: '',
    graduacao: opcao.graduacao,
    login,
    perfil: opcao.perfil,
    clinicaId: null,
    ativo: true,
  }
}

function ensureDefaultClinica(data: ReturnType<typeof loadAppData>): Clinica {
  const existente = data.clinicas.find((clinica) => clinica.id === DEMO_CLINICA_EXEMPLO_ID)
  if (existente) return existente

  const clinica: Clinica = {
    id: DEMO_CLINICA_EXEMPLO_ID,
    nome: DEMO_NOMES.clinica,
    responsavel: 'Demonstração',
    telefone: '',
  }
  data.clinicas.push(clinica)
  return clinica
}

function createExampleEmpenhadoUser(
  empenhado: Clinica,
  data: ReturnType<typeof loadAppData>,
): User {
  const logins = getExistingLogins(data)
  const login = ensureUniqueLogin(slugLogin(`demo-${empenhado.nome}`), logins)
  return {
    id: demoExampleUserId('empenhado', empenhado.id),
    nome: empenhado.nome,
    posto: '',
    graduacao: 'Empenhado',
    login,
    perfil: 'EMPENHADO',
    clinicaId: empenhado.id,
    ativo: true,
  }
}

function ensureDefaultEmpenhado(data: ReturnType<typeof loadAppData>): Clinica {
  const existente = data.clinicas.find((clinica) => clinica.id === DEMO_EMPENHADO_EXEMPLO_ID)
  if (existente) {
    if (existente.nome !== DEMO_NOMES.empenhado) existente.nome = DEMO_NOMES.empenhado
    if (existente.tipo !== 'empenhado') existente.tipo = 'empenhado'
    return existente
  }

  const empenhado: Clinica = {
    id: DEMO_EMPENHADO_EXEMPLO_ID,
    nome: DEMO_NOMES.empenhado,
    responsavel: 'Demonstração',
    telefone: '',
    tipo: 'empenhado',
  }
  data.clinicas.push(empenhado)
  return empenhado
}

function findOrEnsureEmpenhadoUser(
  empenhado: Clinica,
  data: ReturnType<typeof loadAppData>,
): User {
  const existing = data.usuarios.find(
    (user) => user.clinicaId === empenhado.id && user.perfil === 'EMPENHADO' && user.ativo,
  )
  if (existing) {
    if (existing.nome !== empenhado.nome) existing.nome = empenhado.nome
    return existing
  }

  const exampleId = demoExampleUserId('empenhado', empenhado.id)
  const storedExample = data.usuarios.find((user) => user.id === exampleId)
  if (storedExample) {
    storedExample.ativo = true
    storedExample.nome = empenhado.nome
    storedExample.clinicaId = empenhado.id
    storedExample.perfil = 'EMPENHADO'
    return storedExample
  }

  const user = createExampleEmpenhadoUser(empenhado, data)
  data.usuarios.push(user)
  return user
}

function ensureDefaultMedicamento(data: ReturnType<typeof loadAppData>): Clinica {
  const existente = data.clinicas.find((clinica) => clinica.id === DEMO_MEDICAMENTO_EXEMPLO_ID)
  if (existente) return existente

  const medicamento: Clinica = {
    id: DEMO_MEDICAMENTO_EXEMPLO_ID,
    nome: DEMO_NOMES.medicamento,
    responsavel: 'Demonstração',
    telefone: '',
    tipo: 'medicamento',
  }
  data.clinicas.push(medicamento)
  return medicamento
}

function findOrEnsureMedicamentoUser(
  medicamento: Clinica,
  data: ReturnType<typeof loadAppData>,
): User {
  const existing = data.usuarios.find(
    (user) => user.clinicaId === medicamento.id && user.perfil === 'MEDICAMENTO' && user.ativo,
  )
  if (existing) return existing

  const exampleId = demoExampleUserId('medicamento', medicamento.id)
  const storedExample = data.usuarios.find((user) => user.id === exampleId)
  if (storedExample) {
    storedExample.ativo = true
    storedExample.nome = medicamento.nome
    storedExample.clinicaId = medicamento.id
    storedExample.perfil = 'MEDICAMENTO'
    return storedExample
  }

  const user = createExampleMedicamentoUser(medicamento, data)
  data.usuarios.push(user)
  return user
}

function findOrEnsureClinicaUser(clinica: Clinica, data: ReturnType<typeof loadAppData>): User {
  const existing = data.usuarios.find(
    (user) => user.clinicaId === clinica.id && user.perfil === 'CLINICA' && user.ativo,
  )
  if (existing) return existing

  const exampleId = demoExampleUserId('clinica', clinica.id)
  const storedExample = data.usuarios.find((user) => user.id === exampleId)
  if (storedExample) {
    storedExample.ativo = true
    storedExample.nome = clinica.nome
    storedExample.clinicaId = clinica.id
    return storedExample
  }

  const user = createExampleClinicaUser(clinica, data)
  data.usuarios.push(user)
  return user
}

function findOrEnsureSetorUser(opcao: CadastroPerfilOpcao, data: ReturnType<typeof loadAppData>): User {
  const exampleId = demoExampleUserId(opcao.id)
  const storedExample = data.usuarios.find((user) => user.id === exampleId)
  if (storedExample) {
    storedExample.ativo = true
    return storedExample
  }

  const user = createExampleSetorUser(opcao, data)
  data.usuarios.push(user)
  return user
}

function seedDemoExampleCadastros(data: ReturnType<typeof loadAppData>): void {
  const clinica = ensureDefaultClinica(data)
  findOrEnsureClinicaUser(clinica, data)

  const medicamento = ensureDefaultMedicamento(data)
  findOrEnsureMedicamentoUser(medicamento, data)

  const empenhado = ensureDefaultEmpenhado(data)
  findOrEnsureEmpenhadoUser(empenhado, data)

  for (const opcao of CADASTRO_PERFIS) {
    if (opcao.isClinica || opcao.isMedicamento || opcao.isEmpenhado) continue
    findOrEnsureSetorUser(opcao, data)
  }
}

/** Garante planilha de exemplo do Empenhado quando ainda vazia. */
export function seedDemoExampleEmpenhadoPlanilha(data: ReturnType<typeof loadAppData>): boolean {
  if (!data.consumoPlanilha) data.consumoPlanilha = {}

  const current = data.consumoPlanilha[DEMO_EMPENHADO_EXEMPLO_ID]
  if (current?.extraRows?.length) return false

  const state = createDemoPlanilhaExemploState()
  // Garante EMPENHO preenchido nas primeiras linhas para o formato NE (número) nos cards
  state.extraRows = state.extraRows.slice(0, 12).map((row, index) => ({
    ...row,
    id: `emp-demo-${index + 1}`,
    empenho: row.empenho?.trim() || `2026NE${String(4401 + index).padStart(4, '0')}`,
  }))
  data.consumoPlanilha[DEMO_EMPENHADO_EXEMPLO_ID] = state
  return true
}

/** Garante planilha de exemplo do medicamento quando ainda vazia (preserva linhas adicionadas no IndexedDB). */
export function seedDemoExampleMedicamentoPlanilha(data: ReturnType<typeof loadAppData>): boolean {
  if (!data.consumoPlanilha) data.consumoPlanilha = {}

  const current = data.consumoPlanilha[DEMO_MEDICAMENTO_EXEMPLO_ID]
  if (current?.extraRows?.length) return false

  data.consumoPlanilha[DEMO_MEDICAMENTO_EXEMPLO_ID] = createDemoMedicamentoPlanilhaExemploState()
  return true
}

/** Garante a planilha PME do medicamento no IndexedDB da sessão demo (só se estiver vazia). */
export function ensureDemoExampleMedicamentoPlanilha(): boolean {
  if (!isDemoDataSession()) return false

  const data = loadAppData()
  const seeded = seedDemoExampleMedicamentoPlanilha(data)
  if (!seeded) return false

  saveAppData(data)
  return true
}

/** Garante planilha de exemplo fixa (código) para a clínica demo quando ainda vazia. */
export function seedDemoExamplePlanilha(data: ReturnType<typeof loadAppData>): boolean {
  if (!data.consumoPlanilha) data.consumoPlanilha = {}

  const current = data.consumoPlanilha[DEMO_CLINICA_EXEMPLO_ID]
  if (current?.extraRows?.length) return false

  data.consumoPlanilha[DEMO_CLINICA_EXEMPLO_ID] = createDemoPlanilhaExemploState()
  return true
}

/** Recarrega planilha de exemplo no IndexedDB demo se estiver vazia. */
export function ensureDemoExamplePlanilha(): boolean {
  if (!isDemoDataSession()) return false

  const data = loadAppData()
  const seeded = seedDemoExamplePlanilha(data)
  if (!seeded) return false

  saveAppData(data)
  return true
}

/** Garante a planilha OPME do Empenhado no IndexedDB da sessão demo (só se estiver vazia). */
export function ensureDemoExampleEmpenhadoPlanilha(): boolean {
  if (!isDemoDataSession()) return false

  const data = loadAppData()
  const seeded = seedDemoExampleEmpenhadoPlanilha(data)
  if (!seeded) return false

  saveAppData(data)
  return true
}

/** Inicializa AppData de demonstração no IndexedDB (isolado da nuvem). */
export async function initDemoAppData(): Promise<void> {
  if (!isDemoDataSession()) return

  clearAppDataCache()
  reloadAppDataFromStorage()

  const data = loadAppData()
  const before = JSON.stringify({ clinicas: data.clinicas, usuarios: data.usuarios })

  seedDemoExampleCadastros(data)
  const planilhaSeeded =
    seedDemoExamplePlanilha(data) ||
    seedDemoExampleMedicamentoPlanilha(data) ||
    seedDemoExampleEmpenhadoPlanilha(data)

  const after = JSON.stringify({ clinicas: data.clinicas, usuarios: data.usuarios })
  if (before !== after || data.clinicas.length === 0 || planilhaSeeded) {
    saveAppData(data)
  }
}

/** Garante usuários de demonstração no IndexedDB local da sessão demo. */
export async function ensureDemoExampleCadastros(): Promise<void> {
  if (!isDemoDataSession()) return

  const data = loadAppData()
  const before = JSON.stringify({ clinicas: data.clinicas, usuarios: data.usuarios })

  seedDemoExampleCadastros(data)
  const planilhaSeeded =
    seedDemoExamplePlanilha(data) ||
    seedDemoExampleMedicamentoPlanilha(data) ||
    seedDemoExampleEmpenhadoPlanilha(data)

  const after = JSON.stringify({ clinicas: data.clinicas, usuarios: data.usuarios })
  if (before !== after || planilhaSeeded) {
    saveAppData(data)
  }
}

/** Lista fixa de cadastros de exemplo para o modal (sem ler dados da nuvem). */
export function buildDemoCadastroItens(): DemoCadastroItem[] {
  const resultado: DemoCadastroItem[] = [
    {
      id: 'gestor',
      userId: DEMO_GESTOR_OVERVIEW_USER_ID,
      label: 'Gestor',
      nome: 'Visão Geral',
      subtitulo: 'Portal do gestor completo — armazenamento local',
      isExemplo: true,
    },
  ]

  // Ordem = CADASTRO_PERFIS: … → Solemp confeccionada → Empenhado
  for (const opcao of CADASTRO_PERFIS) {
    if (opcao.isClinica) {
      resultado.push({
        id: `clinica-${DEMO_CLINICA_EXEMPLO_ID}`,
        userId: demoExampleUserId('clinica', DEMO_CLINICA_EXEMPLO_ID),
        label: opcao.label,
        nome: DEMO_NOMES.clinica,
        subtitulo: 'Planilha de exemplo Jan–Jun/2026 (691 lançamentos)',
        isExemplo: true,
      })
      continue
    }

    if (opcao.isMedicamento) {
      resultado.push({
        id: `medicamento-${DEMO_MEDICAMENTO_EXEMPLO_ID}`,
        userId: demoExampleUserId('medicamento', DEMO_MEDICAMENTO_EXEMPLO_ID),
        label: opcao.label,
        nome: DEMO_NOMES.medicamento,
        subtitulo: 'Planilha de exemplo com 10 lançamentos',
        isExemplo: true,
      })
      continue
    }

    if (opcao.isEmpenhado) {
      resultado.push({
        id: `empenhado-${DEMO_EMPENHADO_EXEMPLO_ID}`,
        userId: demoExampleUserId('empenhado', DEMO_EMPENHADO_EXEMPLO_ID),
        label: opcao.label,
        nome: DEMO_NOMES.empenhado,
        subtitulo: 'Planilha OPME — empenho no formato NE (número)',
        isExemplo: true,
      })
      continue
    }

    resultado.push({
      id: opcao.id,
      userId: demoExampleUserId(opcao.id),
      label: opcao.label,
      nome: DEMO_NOMES[opcao.id] ?? opcao.label,
      subtitulo: 'Cadastro de exemplo — armazenamento local',
      isExemplo: true,
    })
  }

  return resultado
}

export async function ensureDemoUserById(userId: string): Promise<User> {
  await initDemoAppData()
  await ensureDemoExampleCadastros()

  const data = loadAppData()
  const user = data.usuarios.find((item) => item.id === userId && item.ativo)
  if (!user || user.perfil === 'GESTOR' || user.perfil === 'ADMINISTRADOR') {
    throw new Error('Cadastro de demonstração não encontrado')
  }
  return user
}
