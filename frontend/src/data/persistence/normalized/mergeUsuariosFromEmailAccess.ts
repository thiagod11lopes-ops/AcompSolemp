import type { AppData, User, UserRole } from '@/types'
import { getSupabaseClient } from '@/supabase/client'
import { getTenantId } from '@/services/tenantService'
import { buildUserPerfis, userPerfis } from '@/utils/userPerfis'

function normalizePerfisFromAccess(row: {
  perfil?: string | null
  perfis?: string[] | null
}): UserRole[] {
  const raw =
    Array.isArray(row.perfis) && row.perfis.length > 0
      ? row.perfis
      : row.perfil
        ? [row.perfil]
        : []
  return [
    ...new Set(
      raw
        .map((p) => String(p).trim().toUpperCase())
        .filter(Boolean),
    ),
  ] as UserRole[]
}

/**
 * Reconstrói usuários da equipe a partir de `email_access` quando o blob/tabela
 * perdeu o cadastro (strip + dual-write falho). Não reativa exclusões locais
 * (ativo=false) — só completa quem sumiu de vez.
 */
export async function mergeUsuariosFromEmailAccess(data: AppData): Promise<AppData> {
  const tenantId = getTenantId()
  if (!tenantId) return data

  try {
    const client = getSupabaseClient()
    // perfis pode não existir até a migration; cai para select sem a coluna.
    let rows: Array<{
      email: string
      app_user_id: string
      perfil: string
      clinica_id: string | null
      nome: string | null
      perfis?: string[] | null
    }> | null = null

    {
      const first = await client
        .from('email_access')
        .select('email, app_user_id, perfil, clinica_id, nome, perfis')
        .eq('tenant_id', tenantId)
      if (first.error && /perfis|column/i.test(first.error.message)) {
        const fallback = await client
          .from('email_access')
          .select('email, app_user_id, perfil, clinica_id, nome')
          .eq('tenant_id', tenantId)
        if (fallback.error || !fallback.data?.length) return data
        rows = fallback.data
      } else if (first.error || !first.data?.length) {
        return data
      } else {
        rows = first.data
      }
    }

    const usuarios = [...(data.usuarios ?? [])]
    let changed = false

    for (const row of rows) {
      const email = String(row.email ?? '')
        .trim()
        .toLowerCase()
      if (!email) continue

      const appUserId = String(row.app_user_id ?? '').trim()
      const inactive = usuarios.find(
        (u) =>
          !u.ativo &&
          ((appUserId && u.id === appUserId) ||
            u.email?.trim().toLowerCase() === email),
      )
      // Excluído pelo gestor/recusa/super-admin: não ressuscita por email_access.
      if (inactive) continue

      const existing = usuarios.find(
        (u) =>
          u.ativo &&
          ((appUserId && u.id === appUserId) ||
            u.email?.trim().toLowerCase() === email),
      )
      if (existing) {
        // Garante e-mail/perfis alinhados ao acesso liberado.
        const selected = normalizePerfisFromAccess(row)
        if (selected.length > 0) {
          const built = buildUserPerfis(selected, existing.perfil)
          const samePerfis =
            JSON.stringify(userPerfis(existing)) === JSON.stringify(built.perfis)
          if (!samePerfis || !existing.email) {
            existing.email = email
            existing.perfil = built.perfil
            existing.perfis = built.perfis
            if (row.nome?.trim()) existing.nome = row.nome.trim()
            changed = true
          }
        }
        continue
      }

      const selected = normalizePerfisFromAccess(row)
      if (selected.length === 0) continue
      const { perfil, perfis } = buildUserPerfis(selected)
      const recovered: User = {
        id: appUserId || `user-recovered-${email}`,
        nome: row.nome?.trim() || email.split('@')[0] || 'Usuário',
        posto: '',
        graduacao: '',
        login: email.split('@')[0] || 'user',
        email,
        perfil,
        perfis,
        clinicaId: row.clinica_id ?? null,
        ativo: true,
      }
      usuarios.push(recovered)
      changed = true
    }

    return changed ? { ...data, usuarios } : data
  } catch (error) {
    console.warn('[AcompSolemp] merge email_access → usuarios falhou:', error)
    return data
  }
}
