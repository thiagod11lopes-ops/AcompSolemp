import type { AppData } from '@/types'
import type { AppDataSnapshot } from '@/data/persistence/types'
import { deserializeAppData } from '@/data/persistence/types'
import { mergePedidosFromNormalized } from '@/data/persistence/normalized/pedidosSync'

/** Deserializa o blob e mescla domínios normalizados com leitura ativa. */
export async function hydrateAppDataFromCloudSnapshot(
  snapshot: AppDataSnapshot,
): Promise<AppData> {
  let data = deserializeAppData(snapshot)
  data = await mergePedidosFromNormalized(data)
  return data
}
