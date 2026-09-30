import type { AppData } from '@/types'
import type { AppDataSnapshot } from '@/data/persistence/types'
import { deserializeAppData } from '@/data/persistence/types'
import { mergePedidosFromNormalized } from '@/data/persistence/normalized/pedidosSync'
import { mergeAnexosFromNormalized } from '@/data/persistence/normalized/anexosSync'
import { mergeSimpleArrayFromNormalized } from '@/data/persistence/normalized/simpleArraySync'
import type { HistoricoEvento } from '@/types'

/** Deserializa o blob e mescla domínios normalizados com leitura ativa. */
export async function hydrateAppDataFromCloudSnapshot(
  snapshot: AppDataSnapshot,
): Promise<AppData> {
  let data = deserializeAppData(snapshot)
  data = await mergePedidosFromNormalized(data)
  data = await mergeAnexosFromNormalized(data)
  data = await mergeSimpleArrayFromNormalized<HistoricoEvento>(
    'historico',
    'pedido_historico',
    data,
    'historico',
  )
  return data
}
