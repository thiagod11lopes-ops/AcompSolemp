import type { User, UserRole } from '@/types'

/** Lista efetiva de tipos de cadastro autorizados (retrocompatível com `perfil` único). */
export function userPerfis(user: Pick<User, 'perfil' | 'perfis'>): UserRole[] {
  if (user.perfis?.length) {
    return [...new Set(user.perfis)]
  }
  return user.perfil ? [user.perfil] : []
}

export function userHasPerfil(
  user: Pick<User, 'perfil' | 'perfis'>,
  perfil: UserRole,
): boolean {
  return userPerfis(user).includes(perfil)
}

/** Confecção + Solemp em Rascunho autorizados juntos pelo gestor. */
export function userTemCadeiaSolemp(user: Pick<User, 'perfil' | 'perfis'>): boolean {
  return userHasPerfil(user, 'CONFECCAO_SOLEMP') && userHasPerfil(user, 'FINANCEIRO')
}

export function normalizeUserPerfis<T extends User>(user: T): T {
  const perfis = userPerfis(user)
  const perfil = perfis.includes(user.perfil) ? user.perfil : (perfis[0] ?? user.perfil)
  return {
    ...user,
    perfil,
    perfis,
  }
}

export function buildUserPerfis(selected: UserRole[], primary?: UserRole): {
  perfil: UserRole
  perfis: UserRole[]
} {
  const perfis = [...new Set(selected.filter(Boolean))]
  if (perfis.length === 0) {
    throw new Error('Selecione ao menos um tipo de cadastro')
  }
  const perfil = primary && perfis.includes(primary) ? primary : perfis[0]!
  return { perfil, perfis }
}
