import type { User, UserRole } from '@/types'
import { normalizeEmailKey } from '@/utils/email'
import { delay, loadAppData, saveAppData } from '@/mocks/seed'
import { ensureUniqueLogin, slugLogin } from '@/utils/loginSlug'
import type { CadastroPerfilOpcao } from '@/types/cadastroPerfis'
import { isCadastroEntidadeClinica } from '@/types/cadastroPerfis'

function validateEmail(email: string): string {
  const normalized = normalizeEmailKey(email)
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Informe um e-mail válido')
  }
  return normalized
}

export interface CreatePortalUserInput {
  nome: string
  email: string
  opcao: CadastroPerfilOpcao
}

export interface CreateUserResult {
  user: User
  login: string
}

function getExistingLogins(data: ReturnType<typeof loadAppData>): Set<string> {
  const logins = new Set<string>()
  data.usuarios.forEach((u) => logins.add(u.login))
  return logins
}

function findOrCreateEntidadeClinica(
  nomeEntidade: string,
  data: ReturnType<typeof loadAppData>,
  tipo: 'clinica' | 'medicamento',
): string {
  const nome = nomeEntidade.trim()
  const existente = data.clinicas.find(
    (c) =>
      (c.tipo ?? 'clinica') === tipo &&
      c.nome.localeCompare(nome, 'pt-BR', { sensitivity: 'accent' }) === 0,
  )
  if (existente) return existente.id

  const prefix = tipo === 'medicamento' ? 'medicamento' : 'clinica'
  const entidade = {
    id: `${prefix}-custom-${Date.now()}`,
    nome,
    responsavel: nome,
    telefone: '',
    tipo,
  }
  data.clinicas.push(entidade)
  return entidade.id
}

function assertEmailAvailableLocal(email: string, ignoreUserId?: string): void {
  const data = loadAppData()
  const duplicateLocal = data.usuarios.find(
    (user) =>
      user.id !== ignoreUserId &&
      user.email?.trim().toLowerCase() === email &&
      user.ativo,
  )
  if (duplicateLocal) {
    throw new Error('Este e-mail já está em uso nesta organização')
  }
}

export const usuarioCadastroService = {
  async createPortalUser(input: CreatePortalUserInput): Promise<CreateUserResult> {
    const nome = input.nome.trim()
    const isEntidade = isCadastroEntidadeClinica(input.opcao)
    if (nome.length < 3) {
      throw new Error(
        isEntidade ? `Informe o nome da ${input.opcao.label.toLowerCase()}` : 'Informe o nome',
      )
    }

    const email = validateEmail(input.email)
    assertEmailAvailableLocal(email)

    await delay(null, 200)

    const data = loadAppData()
    const logins = getExistingLogins(data)
    const login = ensureUniqueLogin(slugLogin(nome), logins)
    const perfil: UserRole = input.opcao.perfil
    const tipoEntidade = input.opcao.isMedicamento ? 'medicamento' : 'clinica'
    const clinicaId = isEntidade
      ? findOrCreateEntidadeClinica(nome, data, tipoEntidade)
      : null

    let user: User = {
      id: `user-${input.opcao.id}-${Date.now()}`,
      nome,
      posto: '',
      graduacao: input.opcao.graduacao,
      login,
      email,
      perfil,
      clinicaId,
      ativo: true,
    }

    if (isEntidade && clinicaId) {
      const existingIdx = data.usuarios.findIndex(
        (u) => u.clinicaId === clinicaId && u.perfil === perfil,
      )
      if (existingIdx >= 0) {
        const existing = data.usuarios[existingIdx]
        existing.nome = nome
        existing.email = email
        existing.ativo = true
        user = existing
      } else {
        data.usuarios.push(user)
      }
    } else {
      data.usuarios.push(user)
    }

    saveAppData(data)

    return { user, login }
  },

  async deleteCadastro(input: { isEntidadeClinica: boolean; id: string }): Promise<void> {
    await delay(null, 300)
    const data = loadAppData()

    if (input.isEntidadeClinica) {
      const clinica = data.clinicas.find((c) => c.id === input.id)
      if (!clinica) throw new Error('Cadastro não encontrado')

      data.clinicas = data.clinicas.filter((c) => c.id !== input.id)
      data.usuarios = data.usuarios.filter((u) => u.clinicaId !== input.id)
    } else {
      const user = data.usuarios.find((u) => u.id === input.id)
      if (!user) throw new Error('Usuário não encontrado')
      if (user.perfil === 'ADMINISTRADOR' || user.perfil === 'GESTOR') {
        throw new Error('Este usuário não pode ser excluído')
      }

      data.usuarios = data.usuarios.filter((u) => u.id !== input.id)
    }

    saveAppData(data)
  },
}
