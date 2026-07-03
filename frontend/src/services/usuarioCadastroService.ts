import type { User } from '@/types'
import { delay, loadAppData, MOCK_CREDENTIALS, saveAppData } from '@/mocks/seed'
import { ensureUniqueLogin, slugLogin } from '@/utils/loginSlug'

export interface CreateClinicaUserInput {
  nomeClinica: string
  senha: string
}

export interface CreateOrdenadorUserInput {
  nome: string
  senha: string
}

export interface CreateFinanceiroUserInput {
  nome: string
  senha: string
}

export interface CreateUserResult {
  user: User
  login: string
}

function getExistingLogins(data: ReturnType<typeof loadAppData>): Set<string> {
  const logins = new Set<string>(Object.keys(MOCK_CREDENTIALS))
  Object.keys(data.credenciais ?? {}).forEach((l) => logins.add(l))
  data.usuarios.forEach((u) => logins.add(u.login))
  return logins
}

function findOrCreateClinica(nomeClinica: string, data: ReturnType<typeof loadAppData>): string {
  const nome = nomeClinica.trim()
  const existente = data.clinicas.find(
    (c) => c.nome.localeCompare(nome, 'pt-BR', { sensitivity: 'accent' }) === 0,
  )
  if (existente) return existente.id

  const clinica = {
    id: `clinica-custom-${Date.now()}`,
    nome,
    responsavel: nome,
    telefone: '',
  }
  data.clinicas.push(clinica)
  return clinica.id
}

export const usuarioCadastroService = {
  async createClinicaUser(input: CreateClinicaUserInput): Promise<CreateUserResult> {
    await delay(null, 400)

    const nomeClinica = input.nomeClinica.trim()
    if (nomeClinica.length < 3) throw new Error('Informe o nome da clínica')
    if (input.senha.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres')

    const data = loadAppData()
    const clinicaId = findOrCreateClinica(nomeClinica, data)
    const logins = getExistingLogins(data)
    const login = ensureUniqueLogin(slugLogin(nomeClinica), logins)

    const user: User = {
      id: `user-clinica-${Date.now()}`,
      nome: nomeClinica,
      posto: '',
      graduacao: 'Clínica',
      login,
      perfil: 'CLINICA',
      clinicaId,
      ativo: true,
    }

    data.usuarios.push(user)
    if (!data.credenciais) data.credenciais = {}
    data.credenciais[login] = { senha: input.senha, userId: user.id }
    saveAppData(data)

    return { user, login }
  },

  async createOrdenadorUser(input: CreateOrdenadorUserInput): Promise<CreateUserResult> {
    await delay(null, 400)

    const nome = input.nome.trim()
    if (nome.length < 3) throw new Error('Informe o nome do ordenador de despesa')
    if (input.senha.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres')

    const data = loadAppData()
    const logins = getExistingLogins(data)
    const login = ensureUniqueLogin(slugLogin(nome), logins)

    const user: User = {
      id: `user-ordenador-${Date.now()}`,
      nome,
      posto: '',
      graduacao: 'Ordenador de Despesa',
      login,
      perfil: 'ASSINANTE',
      clinicaId: null,
      ativo: true,
    }

    data.usuarios.push(user)
    if (!data.credenciais) data.credenciais = {}
    data.credenciais[login] = { senha: input.senha, userId: user.id }
    saveAppData(data)

    return { user, login }
  },

  async createFinanceiroUser(input: CreateFinanceiroUserInput): Promise<CreateUserResult> {
    await delay(null, 400)

    const nome = input.nome.trim()
    if (nome.length < 3) throw new Error('Informe o nome do usuário financeiro')
    if (input.senha.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres')

    const data = loadAppData()
    const logins = getExistingLogins(data)
    const login = ensureUniqueLogin(slugLogin(nome), logins)

    const user: User = {
      id: `user-financeiro-${Date.now()}`,
      nome,
      posto: '',
      graduacao: 'Financeiro',
      login,
      perfil: 'FINANCEIRO',
      clinicaId: null,
      ativo: true,
    }

    data.usuarios.push(user)
    if (!data.credenciais) data.credenciais = {}
    data.credenciais[login] = { senha: input.senha, userId: user.id }
    saveAppData(data)

    return { user, login }
  },
}
