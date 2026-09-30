import type { AppData, Pedido, PedidoPlanilhaEnvioState } from '@/types'
import {
  isNormalizedDualWriteEnabled,
  isNormalizedReadEnabled,
} from '@/config/normalizedDataFlags'
import { getSupabaseClient } from '@/supabase/client'
import { getTenantId } from '@/services/tenantService'

/** Dual-write: espelha pedidos + planilha envio nas tabelas normalizadas. */
export async function dualWritePedidos(data: AppData): Promise<void> {
  if (!isNormalizedDualWriteEnabled('pedidos')) return
  const tenantId = getTenantId()
  if (!tenantId) return

  try {
    const client = getSupabaseClient()
    const { error } = await client.rpc('sync_pedidos_from_appdata', {
      p_tenant_id: tenantId,
      p_pedidos: data.pedidos ?? [],
      p_planilha_envio: data.pedidoPlanilhaEnvio ?? {},
    })
    if (error) {
      console.warn('[AcompSolemp] dual-write pedidos:', error.message)
    }
  } catch (error) {
    console.warn('[AcompSolemp] dual-write pedidos indisponível:', error)
  }
}

/** Leitura normalizada com fallback — mescla no AppData se a flag de read estiver on. */
export async function mergePedidosFromNormalized(data: AppData): Promise<AppData> {
  if (!isNormalizedReadEnabled('pedidos')) return data
  const tenantId = getTenantId()
  if (!tenantId) return data

  try {
    const client = getSupabaseClient()
    const [pedidosRes, planilhaRes] = await Promise.all([
      client.from('pedidos').select('id, data').eq('tenant_id', tenantId),
      client.from('pedido_planilha_envio').select('pedido_id, data').eq('tenant_id', tenantId),
    ])

    if (pedidosRes.error) {
      console.warn('[AcompSolemp] read pedidos:', pedidosRes.error.message)
      return data
    }

    const pedidos = (pedidosRes.data ?? [])
      .map((row) => row.data as Pedido)
      .filter((p) => p && typeof p.id === 'string')

    // Se tabela vazia, mantém blob (migração ainda não rodou / tenant novo).
    if (pedidos.length === 0 && (data.pedidos?.length ?? 0) > 0) {
      return data
    }

    const pedidoPlanilhaEnvio: Record<string, PedidoPlanilhaEnvioState> = {
      ...(data.pedidoPlanilhaEnvio ?? {}),
    }
    if (!planilhaRes.error) {
      for (const row of planilhaRes.data ?? []) {
        const pedidoId = String(row.pedido_id)
        pedidoPlanilhaEnvio[pedidoId] = row.data as PedidoPlanilhaEnvioState
      }
    }

    return {
      ...data,
      pedidos: pedidos.length > 0 ? pedidos : data.pedidos,
      pedidoPlanilhaEnvio,
    }
  } catch (error) {
    console.warn('[AcompSolemp] read pedidos indisponível:', error)
    return data
  }
}
