import type {
  AppData,
  ChatMessage,
  Clinica,
  Empresa,
  HistoricoEvento,
  Material,
  NotaFiscal,
  Notification,
  ProcessoArquivado,
  ReversaoTimeline,
  Solemp,
  User,
  WorkflowEtapa,
} from '@/types'
import type { AppDataSnapshot } from '@/data/persistence/types'
import { deserializeAppData } from '@/data/persistence/types'
import { mergePedidosFromNormalized } from '@/data/persistence/normalized/pedidosSync'
import { mergeAnexosFromNormalized } from '@/data/persistence/normalized/anexosSync'
import { mergeSimpleArrayFromNormalized } from '@/data/persistence/normalized/simpleArraySync'
import { mergeUsuariosFromEmailAccess } from '@/data/persistence/normalized/mergeUsuariosFromEmailAccess'

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
  data = await mergeSimpleArrayFromNormalized<Clinica>('cadastros', 'clinicas', data, 'clinicas')
  data = await mergeSimpleArrayFromNormalized<Empresa>('cadastros', 'empresas', data, 'empresas')
  data = await mergeSimpleArrayFromNormalized<Material>(
    'cadastros',
    'materiais',
    data,
    'materiais',
  )
  data = await mergeSimpleArrayFromNormalized<User>('cadastros', 'usuarios', data, 'usuarios')
  const usuariosAntes = data.usuarios.length
  // Recupera equipe liberada em email_access se o blob/tabela perdeu o cadastro.
  data = await mergeUsuariosFromEmailAccess(data)
  const recoveredCadastros = data.usuarios.length > usuariosAntes
  data = await mergeSimpleArrayFromNormalized<WorkflowEtapa>(
    'config',
    'workflow_etapas',
    data,
    'workflowEtapas',
  )
  data = await mergeSimpleArrayFromNormalized<Solemp>('auxiliares', 'solemp', data, 'solemp')
  data = await mergeSimpleArrayFromNormalized<NotaFiscal>(
    'auxiliares',
    'notas_fiscais',
    data,
    'notasFiscais',
  )
  // Se recuperamos cadastros do email_access, regrava no blob para as outras abas.
  if (recoveredCadastros) {
    try {
      const { flushSupabaseAppDataSync } = await import('@/data/persistence/supabaseSync')
      const { saveAppData } = await import('@/mocks/seed')
      saveAppData(data)
      void flushSupabaseAppDataSync()
    } catch (error) {
      console.warn('[AcompSolemp] Falha ao regravar cadastros recuperados:', error)
    }
  }
  return data
}
