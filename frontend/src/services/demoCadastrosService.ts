import type { Clinica, User } from '@/types'
import { CADASTRO_PERFIS, type CadastroPerfilOpcao } from '@/types/cadastroPerfis'
import { isDemoDataSession } from '@/config/dataSource'
import {
  clearAppDataCache,
  loadAppData,
  reloadAppDataFromStorage,
  saveAppData,
} from '@/mocks/seed'
import { createDemoPlanilhaExemploState } from '@/utils/consumoMaterialTemplate'
import { ensureUniqueLogin, slugLogin } from '@/utils/loginSlug'

export const DEMO_EXEMPLO_USER_PREFIX = 'demo-exemplo-'
export const DEMO_CLINICA_EXEMPLO_ID = 'demo-clinica-exemplo'
export const DEMO_GESTOR_OVERVIEW_USER_ID = '__gestor_demo_overview__'

const DEMO_NOMES: Record<string, string> = {
  clinica: 'Clínica Exemplo',
  auditoria: 'Cap. Ana Paula',
  contabilidade: 'Ten. Roberto Lima',
  confeccao: 'Sgt. Maria Souza',
  assinatura1: 'CF João Oliveira',
  assinatura2: 'CMG Pedro Alves',
  sda: '1º Ten. Carla Dias',
  financas: 'Ten. Santos',
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

function demoExampleUserId(opcaoId: string, clinicaId?: string): string {
  if (opcaoId === 'clinica' && clinicaId) {
    return `${DEMO_EXEMPLO_USER_PREFIX}clinica-${clinicaId}`
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

  for (const opcao of CADASTRO_PERFIS) {
    if (opcao.isClinica) continue
    findOrEnsureSetorUser(opcao, data)
  }
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

/** Inicializa AppData de demonstração no IndexedDB (isolado da nuvem). */
export async function initDemoAppData(): Promise<void> {
  if (!isDemoDataSession()) return

  clearAppDataCache()
  reloadAppDataFromStorage()

  const data = loadAppData()
  const before = JSON.stringify({ clinicas: data.clinicas, usuarios: data.usuarios })

  seedDemoExampleCadastros(data)
  const planilhaSeeded = seedDemoExamplePlanilha(data)

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
  const planilhaSeeded = seedDemoExamplePlanilha(data)

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

  const opcaoClinica = CADASTRO_PERFIS.find((opcao) => opcao.isClinica)
  if (opcaoClinica) {
    resultado.push({
      id: `clinica-${DEMO_CLINICA_EXEMPLO_ID}`,
      userId: demoExampleUserId('clinica', DEMO_CLINICA_EXEMPLO_ID),
      label: opcaoClinica.label,
      nome: DEMO_NOMES.clinica,
      subtitulo: 'Planilha de exemplo Jan–Jun/2026 (691 lançamentos)',
      isExemplo: true,
    })
  }

  for (const opcao of CADASTRO_PERFIS) {
    if (opcao.isClinica) continue
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
