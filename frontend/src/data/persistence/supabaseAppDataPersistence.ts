import type { AppData } from '@/types'
import {
  APP_DATA_SEED_VERSION,
  deserializeAppData,
  serializeAppData,
  type AppDataPersistence,
  type AppDataSnapshot,
} from '@/data/persistence/types'
import { getSupabaseClient } from '@/supabase/client'
import { getTenantId, setTenantId } from '@/services/tenantService'
import { isImpersonationSession } from '@/config/dataSource'
import { adminLoadAppState, adminSaveAppState } from '@/data/persistence/supabaseAdmin'
import { mergeUsuariosFromEmailAccess } from '@/data/persistence/normalized/mergeUsuariosFromEmailAccess'

function countActiveTeamUsers(data: AppData): number {
  return (data.usuarios ?? []).filter(
    (u) =>
      u.ativo &&
      u.perfil !== 'GESTOR' &&
      u.perfil !== 'ADMINISTRADOR' &&
      Boolean(u.email?.trim()),
  ).length
}

function mergeUsuariosById(
  primary: AppData['usuarios'],
  secondary: AppData['usuarios'],
): AppData['usuarios'] {
  const byId = new Map<string, (typeof primary)[number]>()
  for (const user of primary ?? []) byId.set(user.id, user)
  for (const user of secondary ?? []) {
    if (!byId.has(user.id)) byId.set(user.id, user)
  }
  return [...byId.values()]
}

/**
 * Impede gravar Cadastros vazios por cima de um estado que ainda tem equipe
 * (ex.: 2ª aba hidratou blob antigo sem usuarios e tentou flush).
 */
async function protectCadastrosBeforeSave(
  outgoing: AppData,
  tenantId: string,
): Promise<AppData> {
  let next: AppData = {
    ...outgoing,
    usuarios: [...(outgoing.usuarios ?? [])],
    clinicas: [...(outgoing.clinicas ?? [])],
  }

  // 1) Completa a partir de email_access (fonte do Cadastros liberado).
  next = await mergeUsuariosFromEmailAccess(next)

  // 2) Se ainda ficou sem equipe, recupera usuarios/clinicas do snapshot atual na nuvem.
  if (countActiveTeamUsers(next) === 0) {
    try {
      const snapshot = await loadAppDataFromSupabase(tenantId)
      if (snapshot) {
        const remote = deserializeAppData(snapshot)
        if (countActiveTeamUsers(remote) > 0) {
          next = {
            ...next,
            usuarios: mergeUsuariosById(next.usuarios, remote.usuarios),
          }
        }
        if ((next.clinicas?.length ?? 0) === 0 && (remote.clinicas?.length ?? 0) > 0) {
          const clinById = new Map(next.clinicas.map((c) => [c.id, c]))
          for (const c of remote.clinicas ?? []) {
            if (!clinById.has(c.id)) clinById.set(c.id, c)
          }
          next = { ...next, clinicas: [...clinById.values()] }
        }
      }
    } catch {
      // Mantém outgoing.
    }
  }

  return next
}

/** Resolve tenant do profile Auth sem importar supabaseTenant (evita ciclo). */
async function resolveAuthProfileTenantId(): Promise<string | null> {
  const client = getSupabaseClient()
  const { data: sessionData } = await client.auth.getSession()
  const userId = sessionData.session?.user?.id
  if (!userId) return null
  const { data, error } = await client
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data?.tenant_id) return null
  return String(data.tenant_id)
}

export async function loadAppDataFromSupabase(
  tenantId?: string | null,
): Promise<AppDataSnapshot | null> {
  const id = tenantId ?? getTenantId()
  if (!id) return null

  if (isImpersonationSession()) {
    const snapshot = await adminLoadAppState(id)
    if (!snapshot) return null
    return {
      version: snapshot.version,
      payload: JSON.stringify(snapshot.payload),
      updatedAt: new Date().toISOString(),
    }
  }

  const { data, error } = await getSupabaseClient()
    .from('app_state')
    .select('version, payload, updated_at')
    .eq('tenant_id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    version: data.version as string,
    payload:
      typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload),
    updatedAt: data.updated_at as string,
  }
}

export async function saveAppDataToSupabase(
  appData: AppData,
  version: string = APP_DATA_SEED_VERSION,
  tenantId?: string | null,
): Promise<void> {
  let id = tenantId ?? getTenantId()

  if (!isImpersonationSession()) {
    // Evita TENANT_ID local obsoleto (outra sessão) — causa
    // "Sem permissão para salvar o estado da organização".
    try {
      const profileTenantId = await resolveAuthProfileTenantId()
      if (profileTenantId && (!id || id !== profileTenantId)) {
        id = profileTenantId
        setTenantId(profileTenantId)
      }
    } catch {
      // Segue com o tenant informado/local.
    }
  }

  if (!id) {
    throw new Error('Tenant não definido para salvar AppData no Supabase.')
  }

  // Fase 1: nunca persistir conteudoBase64 no monolito cloud (Storage + storagePath).
  const { stripAnexoBase64FromAppData } = await import(
    '@/data/persistence/appDataAnexoSanitize'
  )
  // Fase 9: dual-write primeiro precisa do AppData completo; o blob salva versão enxuta.
  let appDataLeve = stripAnexoBase64FromAppData(appData)
  // Protege Cadastros contra flush vazio vindo de outra aba / blob antigo.
  appDataLeve = await protectCadastrosBeforeSave(appDataLeve, id)

  const { stripNormalizedDomainsFromAppData } = await import(
    '@/data/persistence/normalized/stripFromBlob'
  )
  const appDataBlob = stripNormalizedDomainsFromAppData(appDataLeve)

  const snapshot = serializeAppData(appDataBlob, version)
  const payload = JSON.parse(snapshot.payload) as AppData

  // Fase 0: inventário de tamanho do monolito (diagnóstico de egress).
  const { logAppDataPayloadMetrics } = await import(
    '@/data/persistence/appDataPayloadMetrics'
  )
  logAppDataPayloadMetrics(payload, `save tenant=${id}`)

  if (isImpersonationSession()) {
    await adminSaveAppState(id, snapshot.version, payload)
    // Dual-write normalizado também no fluxo admin quando possível.
    const { dualWriteNormalizedDomains } = await import(
      '@/data/persistence/normalized/dualWriteAll'
    )
    await dualWriteNormalizedDomains(appDataLeve)
    return
  }

  const client = getSupabaseClient()

  // RPC security definer: evita RLS no INSERT do upsert (Novo cadastro / sync).
  const { error: rpcError } = await client.rpc('save_app_state_for_tenant', {
    p_tenant_id: id,
    p_version: snapshot.version,
    p_payload: payload,
  })

  if (!rpcError) {
    const { dualWriteNormalizedDomains } = await import(
      '@/data/persistence/normalized/dualWriteAll'
    )
    await dualWriteNormalizedDomains(appDataLeve)
    return
  }

  // Fallback enquanto a migration não foi aplicada no projeto.
  if (/could not find the function|does not exist|PGRST202/i.test(rpcError.message)) {
    const { error } = await client.from('app_state').upsert(
      {
        tenant_id: id,
        version: snapshot.version,
        payload,
        updated_at: snapshot.updatedAt,
      },
      { onConflict: 'tenant_id' },
    )
    if (error) throw new Error(error.message)
    const { dualWriteNormalizedDomains } = await import(
      '@/data/persistence/normalized/dualWriteAll'
    )
    await dualWriteNormalizedDomains(appDataLeve)
    return
  }

  throw new Error(rpcError.message)
}

export function createSupabaseAppDataPersistence(
  resolveTenantId: () => string | null = getTenantId,
): AppDataPersistence {
  return {
    async load() {
      return loadAppDataFromSupabase(resolveTenantId())
    },
    async save(data, version) {
      await saveAppDataToSupabase(data, version, resolveTenantId())
    },
  }
}

export { deserializeAppData, serializeAppData }
