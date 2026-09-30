import type {
  AppData,
  ChatMessage,
  HistoricoEvento,
  Notification,
  ProcessoArquivado,
  ReversaoTimeline,
} from '@/types'
import type { AppDataSnapshot } from '@/data/persistence/types'
import { deserializeAppData } from '@/data/persistence/types'
import { mergePedidosFromNormalized } from '@/data/persistence/normalized/pedidosSync'
import { mergeAnexosFromNormalized } from '@/data/persistence/normalized/anexosSync'
import { mergeSimpleArrayFromNormalized } from '@/data/persistence/normalized/simpleArraySync'

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
  data = await mergeSimpleArrayFromNormalized<ChatMessage>(
    'chat',
    'chat_mensagens',
    data,
    'chatMensagens',
  )
  data = await mergeSimpleArrayFromNormalized<ReversaoTimeline>(
    'reversoes',
    'reversoes',
    data,
    'reversoes',
  )
  data = await mergeSimpleArrayFromNormalized<Notification>(
    'notificacoes',
    'notificacoes',
    data,
    'notificacoes',
  )
  data = await mergeSimpleArrayFromNormalized<ProcessoArquivado>(
    'arquivados',
    'processos_arquivados',
    data,
    'processosArquivados',
  )
  return data
}
