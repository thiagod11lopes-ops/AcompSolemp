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
import { isFictionalDashboardSeedActive } from '@/services/fictionalDashboardSeedService'
import type { CadastroPerfilOpcao, ClinicaEntidadeTipo } from '@/types/cadastroPerfis'
import {
  isCadastroEntidadeClinica,
  resolveClinicaEntidadeTipo,
} from '@/types/cadastroPerfis'
import { buildUserPerfis, userHasPerfil, userPerfis } from '@/utils/userPerfis'

function validateEmail(email: string): string {
  return assertMarinhaEmail(email)
}

export interface CreatePortalUserInput {
  /** Nome do responsável pelo cadastro */
  nome: string
  email: string
  /** Um ou mais tipos autorizados pelo gestor */
  opcoes: CadastroPerfilOpcao[]
  /**
   * Nome da clínica (select) — obrigatório quando o tipo Clínica estiver selecionado.
   * Grava em `Clinica.nome` (coluna Setor na lista).
   */
  clinicaNome?: string
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
  responsavel: string,
): string {
  const nome = nomeEntidade.trim()
  const responsavelTrim = responsavel.trim()
  const existente = data.clinicas.find(
    (c) =>
      (c.tipo ?? 'clinica') === tipo &&
      c.nome.localeCompare(nome, 'pt-BR', { sensitivity: 'accent' }) === 0,
  )
  if (existente) {
    if (responsavelTrim) existente.responsavel = responsavelTrim
    return existente.id
  }

  const prefix =
    tipo === 'medicamento' ? 'medicamento' : tipo === 'empenhado' ? 'empenhado' : 'clinica'
  const entidade = {
    id: `${prefix}-custom-${Date.now()}`,
    nome,
    responsavel: responsavelTrim || nome,
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

function validateOpcoesCadastro(opcoes: CadastroPerfilOpcao[]): CadastroPerfilOpcao[] {
  if (!opcoes.length) throw new Error('Selecione ao menos um tipo de cadastro')
  const entidades = opcoes.filter((o) => isCadastroEntidadeClinica(o))
  const setores = opcoes.filter((o) => !isCadastroEntidadeClinica(o))
  if (entidades.length > 1) {
    throw new Error('Selecione apenas um tipo entre Clínica, Medicamento ou Empenhado.')
  }
  if (entidades.length > 0 && setores.length > 0) {
    throw new Error(
      'Tipos de clínica/medicamento/empenhado não podem ser combinados com setores da Div. de Material.',
    )
  }
  const uniqueByPerfil = new Map<UserRole, CadastroPerfilOpcao>()
  for (const opcao of opcoes) uniqueByPerfil.set(opcao.perfil, opcao)
  return [...uniqueByPerfil.values()]
}

export const usuarioCadastroService = {
  async createPortalUser(input: CreatePortalUserInput): Promise<CreateUserResult> {
    const opcoes = validateOpcoesCadastro(input.opcoes)
    const primaria = opcoes[0]!
    const nome = input.nome.trim()
    const isEntidade = isCadastroEntidadeClinica(primaria)
    const isClinica = Boolean(primaria.isClinica)
    const clinicaNome = input.clinicaNome?.trim() ?? ''

    if (nome.length < 3) {
      throw new Error('Informe o nome do responsável')
    }
    if (isClinica && !clinicaNome) {
      throw new Error('Selecione a clínica')
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
    const { perfil, perfis } = buildUserPerfis(opcoes.map((o) => o.perfil))
    const graduacao = opcoes.map((o) => o.graduacao).join(' · ')
    const tipoEntidade = resolveClinicaEntidadeTipo(primaria)
    // Clínica: entidade = select; demais entidades: nome do responsável identifica a unidade.
    const nomeEntidade = isClinica ? clinicaNome : nome
    const clinicaId = isEntidade
      ? findOrCreateEntidadeClinica(nomeEntidade, data, tipoEntidade, nome)
      : null

    let user: User = {
      id: `user-${primaria.id}-${Date.now()}`,
      nome,
      posto: '',
      graduacao,
      login,
      email,
      perfil,
      perfis,
      clinicaId,
      ativo: true,
    }

    // Reativa cadastro anterior do mesmo e-mail (inclusive inativo após exclusão)
    const inactiveSameEmail = data.usuarios.find(
      (u) =>
        !u.ativo &&
        u.email?.trim().toLowerCase() === email &&
        u.perfil !== 'GESTOR' &&
        u.perfil !== 'ADMINISTRADOR',
    )

    if (isEntidade && clinicaId) {
      const existingIdx = data.usuarios.findIndex(
        (u) => u.clinicaId === clinicaId && userHasPerfil(u, perfil),
      )
      if (existingIdx >= 0) {
        const existing = data.usuarios[existingIdx]
        if (useCloudAppDataSync() && existing.email && existing.email !== email) {
          await removeEmailAccess(existing.email, tenantId)
        }
        existing.nome = nome
        existing.email = email
        existing.ativo = true
        existing.perfil = perfil
        existing.perfis = perfis
        existing.graduacao = graduacao
        user = existing
      } else if (inactiveSameEmail) {
        inactiveSameEmail.nome = nome
        inactiveSameEmail.email = email
        inactiveSameEmail.perfil = perfil
        inactiveSameEmail.perfis = perfis
        inactiveSameEmail.clinicaId = clinicaId
        inactiveSameEmail.graduacao = graduacao
        inactiveSameEmail.ativo = true
        user = inactiveSameEmail
      } else {
        data.usuarios.push(user)
      }
    } else if (inactiveSameEmail) {
      inactiveSameEmail.nome = nome
      inactiveSameEmail.email = email
      inactiveSameEmail.perfil = perfil
      inactiveSameEmail.perfis = perfis
      inactiveSameEmail.clinicaId = null
      inactiveSameEmail.graduacao = graduacao
      inactiveSameEmail.ativo = true
      user = inactiveSameEmail
    } else {
      // Mesmo e-mail ativo: atualiza tipos autorizados
      const activeSameEmail = data.usuarios.find(
        (u) =>
          u.ativo &&
          u.email?.trim().toLowerCase() === email &&
          u.perfil !== 'GESTOR' &&
          u.perfil !== 'ADMINISTRADOR',
      )
      if (activeSameEmail) {
        const merged = [...new Set([...userPerfis(activeSameEmail), ...perfis])]
        const built = buildUserPerfis(merged, perfil)
        activeSameEmail.nome = nome
        activeSameEmail.perfil = built.perfil
        activeSameEmail.perfis = built.perfis
        activeSameEmail.graduacao = graduacao
        activeSameEmail.clinicaId = null
        user = activeSameEmail
      } else {
        data.usuarios.push(user)
      }
    }

    saveAppData(data)

    // Seed fictício: alterações ficam só no snapshot local (não poluem nuvem/email_access).
    if (isFictionalDashboardSeedActive()) {
      return { user, login }
    }

    if (useCloudAppDataSync()) {
      await flushSupabaseAppDataSync()
    }

    // Demo / acesso sem senha: não grava email_access na nuvem.
    if (useCloudAppDataSync() && tenantId) {
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
    const tenantId = getTenantId()

    const revokeEmails = async (emails: string[]) => {
      if (!useCloudAppDataSync()) return
      const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
      for (const email of unique) {
        try {
          await removeEmailAccess(email, tenantId)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          // Já removido / inexistente: exclusão local já concluiu.
          if (/não autenticado|sem permissão|pertence a outra/i.test(message)) {
            throw err instanceof Error ? err : new Error(message)
          }
        }
      }
    }

    if (input.isEntidadeClinica) {
      const clinica = data.clinicas.find((c) => c.id === input.id)
      if (!clinica) throw new Error('Cadastro não encontrado')

      const usersToRevoke = data.usuarios.filter((u) => u.clinicaId === input.id && u.ativo)
      const emails = usersToRevoke
        .map((u) => u.email?.trim() ?? '')
        .filter(Boolean)

      // Mantém clínica e histórico; só revoga acesso e desativa (mantém e-mail para reativação)
      for (const user of data.usuarios) {
        if (user.clinicaId === input.id) {
          user.ativo = false
        }
      }

      saveAppData(data)
      if (isFictionalDashboardSeedActive()) return
      if (useCloudAppDataSync()) {
        await flushSupabaseAppDataSync()
      }

      await revokeEmails(emails)
      return
    }

    const user = data.usuarios.find((u) => u.id === input.id)
    if (!user) throw new Error('Usuário não encontrado')
    const email = user.email?.trim() ?? ''
    user.ativo = false
    saveAppData(data)
    if (isFictionalDashboardSeedActive()) return
    if (useCloudAppDataSync()) {
      await flushSupabaseAppDataSync()
    }
    if (email) {
      await revokeEmails([email])
    }
  },
}
