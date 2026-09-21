import type { User, UserRole } from '@/types'
import { assertMarinhaEmail } from '@/utils/email'
import { useSupabaseDataSource, useCloudAppDataSync } from '@/config/dataSource'
import { delay, loadAppData, saveAppData } from '@/mocks/seed'
import { ensureUniqueLogin, slugLogin } from '@/utils/loginSlug'
import { getTenantId } from '@/services/tenantService'
import {
  removeEmailAccess,
  upsertEmailAccess,
} from '@/data/persistence/supabaseTenant'
import { flushSupabaseAppDataSync } from '@/data/persistence/supabaseSync'
import type { CadastroPerfilOpcao, ClinicaEntidadeTipo } from '@/types/cadastroPerfis'
import { isCadastroEntidadeClinica, resolveClinicaEntidadeTipo } from '@/types/cadastroPerfis'

function validateEmail(email: string): string {
  return assertMarinhaEmail(email)
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
  tipo: ClinicaEntidadeTipo,
): string {
  const nome = nomeEntidade.trim()
  const existente = data.clinicas.find(
    (c) =>
      (c.tipo ?? 'clinica') === tipo &&
      c.nome.localeCompare(nome, 'pt-BR', { sensitivity: 'accent' }) === 0,
  )
  if (existente) return existente.id

  const prefix =
    tipo === 'medicamento' ? 'medicamento' : tipo === 'empenhado' ? 'empenhado' : 'clinica'
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

/** Impede o gestor de liberar o próprio e-mail como usuário da Timeline. */
function assertNotGestorOwnEmail(email: string): void {
  const data = loadAppData()
  const ownerEmail = data.tenantMeta?.ownerEmail?.trim().toLowerCase()
  if (ownerEmail && ownerEmail === email) {
    throw new Error(
      'Não é permitido cadastrar o próprio e-mail do gestor. Use outro @marinha.mil.br para a equipe.',
    )
  }

  const gestorComMesmoEmail = data.usuarios.find(
    (user) =>
      user.ativo &&
      (user.perfil === 'GESTOR' || user.perfil === 'ADMINISTRADOR') &&
      user.email?.trim().toLowerCase() === email,
  )
  if (gestorComMesmoEmail) {
    throw new Error(
      'Não é permitido cadastrar o próprio e-mail do gestor. Use outro @marinha.mil.br para a equipe.',
    )
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
    assertNotGestorOwnEmail(email)
    assertEmailAvailableLocal(email)

    const tenantId = getTenantId()
    if (useSupabaseDataSource() && !tenantId) {
      throw new Error('Organização do gestor não encontrada. Faça login novamente.')
    }

    await delay(null, 200)

    const data = loadAppData()
    const logins = getExistingLogins(data)
    const login = ensureUniqueLogin(slugLogin(nome), logins)
    const perfil: UserRole = input.opcao.perfil
    const tipoEntidade = resolveClinicaEntidadeTipo(input.opcao)
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

    // Reativa cadastro anterior do mesmo e-mail (dados preservados na exclusão)
    const inactiveSameEmail = data.usuarios.find(
      (u) =>
        !u.ativo &&
        u.email?.trim().toLowerCase() === email &&
        u.perfil !== 'GESTOR' &&
        u.perfil !== 'ADMINISTRADOR',
    )

    if (isEntidade && clinicaId) {
      const existingIdx = data.usuarios.findIndex(
        (u) => u.clinicaId === clinicaId && u.perfil === perfil,
      )
      if (existingIdx >= 0) {
        const existing = data.usuarios[existingIdx]
        if (useSupabaseDataSource() && existing.email && existing.email !== email) {
          await removeEmailAccess(existing.email)
        }
        existing.nome = nome
        existing.email = email
        existing.ativo = true
        existing.perfil = perfil
        user = existing
      } else if (inactiveSameEmail) {
        inactiveSameEmail.nome = nome
        inactiveSameEmail.email = email
        inactiveSameEmail.perfil = perfil
        inactiveSameEmail.clinicaId = clinicaId
        inactiveSameEmail.graduacao = input.opcao.graduacao
        inactiveSameEmail.ativo = true
        user = inactiveSameEmail
      } else {
        data.usuarios.push(user)
      }
    } else if (inactiveSameEmail) {
      inactiveSameEmail.nome = nome
      inactiveSameEmail.email = email
      inactiveSameEmail.perfil = perfil
      inactiveSameEmail.clinicaId = null
      inactiveSameEmail.graduacao = input.opcao.graduacao
      inactiveSameEmail.ativo = true
      user = inactiveSameEmail
    } else {
      data.usuarios.push(user)
    }

    saveAppData(data)

    if (useCloudAppDataSync()) {
      await flushSupabaseAppDataSync()
    }

    if (useSupabaseDataSource() && tenantId) {
      await upsertEmailAccess({
        email,
        tenantId,
        appUserId: user.id,
        perfil: user.perfil,
        clinicaId: user.clinicaId,
        nome: user.nome,
      })
    }

    return { user, login }
  },

  async deleteCadastro(input: { isEntidadeClinica: boolean; id: string }): Promise<void> {
    await delay(null, 300)
    const data = loadAppData()

    if (input.isEntidadeClinica) {
      const clinica = data.clinicas.find((c) => c.id === input.id)
      if (!clinica) throw new Error('Cadastro não encontrado')

      const usersToRevoke = data.usuarios.filter((u) => u.clinicaId === input.id && u.ativo)

      // Mantém clínica e histórico; só revoga acesso e desativa o e-mail
      for (const user of data.usuarios) {
        if (user.clinicaId === input.id) {
          user.ativo = false
        }
      }

      if (useSupabaseDataSource()) {
        await Promise.all(
          usersToRevoke
            .filter((user) => user.email)
            .map((user) => removeEmailAccess(user.email!)),
        )
      }
    } else {
      const user = data.usuarios.find((u) => u.id === input.id)
      if (!user) throw new Error('Usuário não encontrado')
      if (user.perfil === 'ADMINISTRADOR' || user.perfil === 'GESTOR') {
        throw new Error('Este usuário não pode ser excluído')
      }

      if (useSupabaseDataSource() && user.email) {
        await removeEmailAccess(user.email)
      }
      // Mantém o registro e os dados gerados; remove só o acesso
      user.ativo = false
    }

    saveAppData(data)
    if (useCloudAppDataSync()) {
      await flushSupabaseAppDataSync()
    }
  },
}
