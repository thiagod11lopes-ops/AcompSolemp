import type { User, UserRole } from '@/types'
import { useFirebaseDataSource } from '@/config/dataSource'
import {
  getEmailAccess,
  normalizeEmailKey,
  registerEmailAccess,
  removeEmailAccess,
} from '@/data/persistence/emailAccessPersistence'
import { delay, loadAppData, saveAppData } from '@/mocks/seed'
import { flushFirebaseAppDataSync } from '@/data/persistence/firebaseSync'
import { ensureUniqueLogin, slugLogin } from '@/utils/loginSlug'
import { getTenantId } from '@/services/tenantService'
import type { CadastroPerfilOpcao } from '@/types/cadastroPerfis'
import { isCadastroEntidadeClinica } from '@/types/cadastroPerfis'

function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'permission-denied'
  )
}

function wrapFirebasePermissionError(error: unknown): Error {
  if (isPermissionDenied(error)) {
    return new Error(
      'Sem permissão no Firebase. Entre novamente com Google no Portal do Gestor.',
    )
  }
  return error instanceof Error ? error : new Error('Erro ao salvar cadastro')
}

function validateGoogleEmail(email: string): string {
  const normalized = normalizeEmailKey(email)
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Informe um e-mail Google válido')
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

async function assertEmailAvailableInTenant(
  email: string,
  tenantId: string,
  ignoreUserId?: string,
): Promise<void> {
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

  if (!useFirebaseDataSource()) return

  const existing = await getEmailAccess(email)
  if (existing && existing.tenantId !== tenantId) {
    throw new Error('Este e-mail já está em uso em outra organização')
  }
  if (existing && existing.userId !== ignoreUserId && existing.tenantId === tenantId) {
    throw new Error('Este e-mail já está em uso nesta organização')
  }
}

export const usuarioCadastroService = {
  async createPortalUser(input: CreatePortalUserInput): Promise<CreateUserResult> {
    if (useFirebaseDataSource()) {
      try {
        const { authService } = await import('@/services/authService')
        await authService.ensureGestorFirebaseSession({ interactive: true })
      } catch (error) {
        throw wrapFirebasePermissionError(error)
      }
    }

    const nome = input.nome.trim()
    const isEntidade = isCadastroEntidadeClinica(input.opcao)
    if (nome.length < 3) {
      throw new Error(
        isEntidade ? `Informe o nome da ${input.opcao.label.toLowerCase()}` : 'Informe o nome',
      )
    }

    const email = validateGoogleEmail(input.email)
    const tenantId = getTenantId()
    if (useFirebaseDataSource() && !tenantId) {
      throw new Error('Organização do gestor não encontrada. Faça login novamente.')
    }

    await assertEmailAvailableInTenant(email, tenantId ?? 'local', undefined)

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
        if (useFirebaseDataSource() && existing.email && existing.email !== email) {
          await removeEmailAccess(existing.email)
        }
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

    if (useFirebaseDataSource()) {
      await flushFirebaseAppDataSync()
    }

    if (useFirebaseDataSource() && tenantId) {
      try {
        await registerEmailAccess(
          email,
          {
            tenantId,
            userId: user.id,
            perfil: user.perfil,
            clinicaId: user.clinicaId,
            nome: user.nome,
          },
          tenantId,
        )
      } catch (error) {
        throw wrapFirebasePermissionError(error)
      }
    }

    return { user, login }
  },

  async deleteCadastro(input: { isEntidadeClinica: boolean; id: string }): Promise<void> {
    await delay(null, 300)
    const data = loadAppData()

    if (input.isEntidadeClinica) {
      const clinica = data.clinicas.find((c) => c.id === input.id)
      if (!clinica) throw new Error('Cadastro não encontrado')

      const usersToRemove = data.usuarios.filter((u) => u.clinicaId === input.id)

      data.clinicas = data.clinicas.filter((c) => c.id !== input.id)
      data.usuarios = data.usuarios.filter((u) => u.clinicaId !== input.id)

      if (useFirebaseDataSource()) {
        await Promise.all(usersToRemove.map((user) => removeEmailAccess(user.email)))
      }
    } else {
      const user = data.usuarios.find((u) => u.id === input.id)
      if (!user) throw new Error('Usuário não encontrado')
      if (user.perfil === 'ADMINISTRADOR' || user.perfil === 'GESTOR') {
        throw new Error('Este usuário não pode ser excluído')
      }

      if (useFirebaseDataSource()) {
        await removeEmailAccess(user.email)
      }
      data.usuarios = data.usuarios.filter((u) => u.id !== input.id)
    }

    saveAppData(data)
  },
}
