import type { AppData } from '@/types'
import { dualWritePedidos } from '@/data/persistence/normalized/pedidosSync'
import { dualWriteAnexos } from '@/data/persistence/normalized/anexosSync'
import { dualWriteSimpleArray } from '@/data/persistence/normalized/simpleArraySync'

/** Orquestra dual-write de todos os domínios com flag ativa. */
export async function dualWriteNormalizedDomains(data: AppData): Promise<void> {
  await Promise.all([
    dualWritePedidos(data),
    dualWriteAnexos(data),
    dualWriteSimpleArray('historico', 'pedido_historico', data.historico),
    dualWriteSimpleArray('chat', 'chat_mensagens', data.chatMensagens),
  ])
}
