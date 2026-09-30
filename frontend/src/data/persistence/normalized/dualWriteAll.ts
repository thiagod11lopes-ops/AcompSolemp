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
    dualWriteSimpleArray('reversoes', 'reversoes', data.reversoes),
    dualWriteSimpleArray('notificacoes', 'notificacoes', data.notificacoes),
    dualWriteSimpleArray('arquivados', 'processos_arquivados', data.processosArquivados),
    dualWriteSimpleArray('cadastros', 'clinicas', data.clinicas),
    dualWriteSimpleArray('cadastros', 'empresas', data.empresas),
    dualWriteSimpleArray('cadastros', 'materiais', data.materiais),
    dualWriteSimpleArray('cadastros', 'usuarios', data.usuarios),
    dualWriteSimpleArray('config', 'workflow_etapas', data.workflowEtapas),
    dualWriteSimpleArray('auxiliares', 'solemp', data.solemp),
    dualWriteSimpleArray('auxiliares', 'notas_fiscais', data.notasFiscais),
  ])
}
