import type { ReactNode } from 'react'
import type { User, UserRole } from '@/types'
import { loginPerfilLabel } from '@/utils/loginPerfis'
import { PERFIL_PARA_CHAVE_ETAPA, CHAVES_CONFECCAO_CADEIA } from '@/utils/perfilEtapa'
import { userPerfis, userTemCadeiaSolemp } from '@/utils/userPerfis'

/** Ordem de exibição das abas de setor no menu lateral. */
const ORDEM_SETORES: UserRole[] = [
  'AUDITORIA',
  'CONTABILIDADE_IMH',
  'CONFECCAO_SOLEMP',
  'FINANCEIRO',
]

export interface SetorNavItem {
  path: string
  label: string
  etapa?: string
  perfil?: UserRole
}

/**
 * Abas laterais para os setores autorizados no cadastro (perfis[]).
 * Empenhado não vira aba: é só etapa concluída automática na timeline.
 */
export function setorNavItemsParaUsuario(
  user: Pick<User, 'perfil' | 'perfis'>,
): SetorNavItem[] {
  const perfis = userPerfis(user)
  const setores = ORDEM_SETORES.filter((p) => perfis.includes(p))
  if (setores.length === 0) return []

  const items: SetorNavItem[] = []
  const cadeia = userTemCadeiaSolemp(user)

  for (const perfil of setores) {
    if (perfil === 'FINANCEIRO' && cadeia) {
      // Rascunho já entra abaixo via chave da cadeia; evita duplicar.
      continue
    }
    if (perfil === 'CONFECCAO_SOLEMP' && cadeia) {
      items.push({
        path: '/ordenador/timelines',
        label: loginPerfilLabel('CONFECCAO_SOLEMP'),
        etapa: 'DIV_MAT_CONFECCAO_SOLEMP',
        perfil: 'CONFECCAO_SOLEMP',
      })
      items.push({
        path: '/ordenador/timelines',
        label: loginPerfilLabel('FINANCEIRO'),
        etapa: 'DIV_MAT_FINANCAS',
        perfil: 'FINANCEIRO',
      })
      continue
    }

    const etapa = PERFIL_PARA_CHAVE_ETAPA[perfil]
    if (!etapa) continue
    items.push({
      path: perfil === 'FINANCEIRO' ? '/financeiro/pagamentos' : '/ordenador/timelines',
      label: loginPerfilLabel(perfil),
      etapa: perfil === 'FINANCEIRO' ? undefined : etapa,
      perfil,
    })
  }

  return items
}

/** True quando o usuário tem mais de um setor (ou cadeia) — menu lateral com abas. */
export function userTemMultiSetorNav(user: Pick<User, 'perfil' | 'perfis'>): boolean {
  const items = setorNavItemsParaUsuario(user)
  return items.length > 1 || userTemCadeiaSolemp(user)
}

/** Chaves de etapa que o filtro `?etapa=` pode aceitar para este usuário. */
export function etapasNavPermitidas(user: Pick<User, 'perfil' | 'perfis'>): string[] {
  const items = setorNavItemsParaUsuario(user)
  const fromNav = items.map((i) => i.etapa).filter((e): e is string => Boolean(e))
  if (userTemCadeiaSolemp(user)) {
    // Sem Empenhado: não há aba/filtro de navegação para essa etapa.
    return [
      ...new Set(
        [...fromNav, ...CHAVES_CONFECCAO_CADEIA].filter((c) => c !== 'DIV_MAT_EMPENHADO'),
      ),
    ]
  }
  return [...new Set(fromNav)]
}

export function setorNavSubtitle(user: Pick<User, 'perfil' | 'perfis'>): string {
  const labels = setorNavItemsParaUsuario(user).map((i) => i.label)
  if (labels.length === 0) return loginPerfilLabel(user.perfil)
  return labels.join(' · ')
}

/** Ícone opcional injetado pelo layout (evita acoplar MUI Icons neste util). */
export type SetorNavItemWithIcon = SetorNavItem & { icon: ReactNode }
