import type { User, UserRole } from '@/types'
import { useFirebaseDataSource } from '@/config/dataSource'
import { firebaseAuthAdapter } from '@/firebase/authAdapter'
import { delay, loadAppData, MOCK_CREDENTIALS, saveAppData } from '@/mocks/seed'
import { ensureUniqueLogin, slugLogin } from '@/utils/loginSlug'
import { getTenantId } from '@/services/tenantService'
import type { CadastroPerfilOpcao } from '@/types/cadastroPerfis'

export function getCredenciaisPorLogin(): Record<string, string> {
  const data = loadAppData()
  const map: Record<string, string> = {}

  for (const [login, cred] of Object.entries(MOCK_CREDENTIALS)) {
    map[login] = cred.senha
  }
  for (const [login, cred] of Object.entries(data.credenciais ?? {})) {
    map[login] = cred.senha
  }

  return map
}

export interface CreatePortalUserInput {
  nome: string
  senha: string
  opcao: CadastroPerfilOpcao
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
  async createPortalUser(input: CreatePortalUserInput): Promise<CreateUserResult> {
    await delay(null, 400)

    const nome = input.nome.trim()
    if (nome.length < 3) {
      throw new Error(
        input.opcao.isClinica ? 'Informe o nome da clínica' : 'Informe o nome',
      )
    }
    if (input.senha.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres')

    const data = loadAppData()
    const logins = getExistingLogins(data)
    const login = ensureUniqueLogin(slugLogin(nome), logins)
    const perfil: UserRole = input.opcao.perfil

    const clinicaId = input.opcao.isClinica ? findOrCreateClinica(nome, data) : null

    const user: User = {
      id: `user-${input.opcao.id}-${Date.now()}`,
      nome,
      posto: '',
      graduacao: input.opcao.graduacao,
      login,
      perfil,
      clinicaId,
      ativo: true,
    }

    data.usuarios.push(user)
    if (!data.credenciais) data.credenciais = {}
    data.credenciais[login] = { senha: input.senha, userId: user.id }
    saveAppData(data)

    if (useFirebaseDataSource()) {
      const tenantId = getTenantId()
      if (tenantId) {
        await firebaseAuthAdapter.createPortalUser(tenantId, login, input.senha)
      }
    }

    return { user, login }
  },

  async updateUsuarioEmail(userId: string, email: string): Promise<User> {
    await delay(null, 200)
    const normalized = email.trim().toLowerCase()
    if (!normalized || !normalized.includes('@')) {
      throw new Error('Informe um e-mail válido')
    }

    const data = loadAppData()
    const user = data.usuarios.find((u) => u.id === userId)
    if (!user) throw new Error('Usuário não encontrado')

    const duplicate = data.usuarios.find(
      (u) => u.id !== userId && u.email?.trim().toLowerCase() === normalized,
    )
    if (duplicate) throw new Error('Este e-mail já está em uso por outro usuário')

    user.email = normalized
    saveAppData(data)
    return user
  },

  async deleteCadastro(input: {
    isClinica: boolean
    id: string
  }): Promise<void> {
    await delay(null, 300)
    const data = loadAppData()

    if (input.isClinica) {
      const clinica = data.clinicas.find((c) => c.id === input.id)
      if (!clinica) throw new Error('Clínica não encontrada')

      const usersToRemove = data.usuarios.filter((u) => u.clinicaId === input.id)
      const logins = usersToRemove.map((u) => u.login)

      data.clinicas = data.clinicas.filter((c) => c.id !== input.id)
      data.usuarios = data.usuarios.filter((u) => u.clinicaId !== input.id)

      if (data.credenciais) {
        logins.forEach((login) => {
          delete data.credenciais[login]
        })
      }
    } else {
      const user = data.usuarios.find((u) => u.id === input.id)
      if (!user) throw new Error('Usuário não encontrado')
      if (user.perfil === 'ADMINISTRADOR' || user.perfil === 'GESTOR') {
        throw new Error('Este usuário não pode ser excluído')
      }

      if (data.credenciais) {
        delete data.credenciais[user.login]
      }
      data.usuarios = data.usuarios.filter((u) => u.id !== input.id)
    }

    saveAppData(data)
  },
}
