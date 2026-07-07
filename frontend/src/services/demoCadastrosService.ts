import type { Clinica, User } from '@/types'
import { CADASTRO_PERFIS, type CadastroPerfilOpcao } from '@/types/cadastroPerfis'
import { useFirebaseDataSource } from '@/config/dataSource'
import { flushFirebaseAppDataSync } from '@/data/persistence/firebaseSync'
import { loadAppData, saveAppData } from '@/mocks/seed'
import { ensureUniqueLogin, slugLogin } from '@/utils/loginSlug'

export const DEMO_EXEMPLO_USER_PREFIX = 'demo-exemplo-'
export const DEMO_CLINICA_EXEMPLO_ID = 'demo-clinica-exemplo'

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
  const existing = data.usuarios.find((user) => user.perfil === opcao.perfil && user.ativo)
  if (existing) return existing

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

function resolveClinicaUser(data: ReturnType<typeof loadAppData>, clinica: Clinica): User | null {
  return (
    data.usuarios.find(
      (user) => user.clinicaId === clinica.id && user.perfil === 'CLINICA' && user.ativo,
    ) ?? null
  )
}

function resolveSetorUser(data: ReturnType<typeof loadAppData>, opcao: CadastroPerfilOpcao): User | null {
  return data.usuarios.find((user) => user.perfil === opcao.perfil && user.ativo) ?? null
}

/** Garante usuários de demonstração para cada clínica e setor da organização. */
export async function ensureDemoExampleCadastros(): Promise<void> {
  const data = loadAppData()
  const before = JSON.stringify({ clinicas: data.clinicas, usuarios: data.usuarios })

  if (data.clinicas.length === 0) {
    ensureDefaultClinica(data)
  }

  for (const clinica of data.clinicas) {
    findOrEnsureClinicaUser(clinica, data)
  }

  for (const opcao of CADASTRO_PERFIS) {
    if (opcao.isClinica) continue
    findOrEnsureSetorUser(opcao, data)
  }

  const after = JSON.stringify({ clinicas: data.clinicas, usuarios: data.usuarios })
  if (before === after) return

  saveAppData(data)
  if (useFirebaseDataSource()) {
    await flushFirebaseAppDataSync()
  }
}

export function buildDemoCadastroItens(): DemoCadastroItem[] {
  const data = loadAppData()
  const clinicas =
    data.clinicas.length > 0 ? data.clinicas : [data.clinicas.find((c) => c.id === DEMO_CLINICA_EXEMPLO_ID)].filter(Boolean) as Clinica[]
  const resultado: DemoCadastroItem[] = []

  const opcaoClinica = CADASTRO_PERFIS.find((opcao) => opcao.isClinica)
  if (opcaoClinica) {
    for (const clinica of clinicas) {
      const user = resolveClinicaUser(data, clinica)
      if (!user) continue
      resultado.push({
        id: `clinica-${clinica.id}`,
        userId: user.id,
        label: opcaoClinica.label,
        nome: clinica.nome,
        subtitulo: isDemoExampleUser(user)
          ? 'Cadastro de exemplo — acesso direto'
          : user.email?.trim() || 'Cadastro da organização',
        isExemplo: isDemoExampleUser(user),
      })
    }
  }

  for (const opcao of CADASTRO_PERFIS) {
    if (opcao.isClinica) continue
    const user = resolveSetorUser(data, opcao)
    if (!user) continue
    resultado.push({
      id: opcao.id,
      userId: user.id,
      label: opcao.label,
      nome: user.nome,
      subtitulo: isDemoExampleUser(user)
        ? 'Cadastro de exemplo — acesso direto'
        : user.email?.trim() || 'Cadastro da organização',
      isExemplo: isDemoExampleUser(user),
    })
  }

  return resultado
}

export async function ensureDemoUserById(userId: string): Promise<User> {
  await ensureDemoExampleCadastros()
  const data = loadAppData()
  const user = data.usuarios.find((item) => item.id === userId && item.ativo)
  if (!user || user.perfil === 'GESTOR' || user.perfil === 'ADMINISTRADOR') {
    throw new Error('Cadastro de demonstração não encontrado')
  }
  return user
}
