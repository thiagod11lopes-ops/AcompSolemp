import type { AppData } from '@/types'
import { isNormalizedStripFromBlobEnabled } from '@/config/normalizedDataFlags'

/**
 * Remove do payload de `app_state` os domínios já normalizados (Fase 9).
 * A hidratação reconstrói esses campos a partir das tabelas.
 */
export function stripNormalizedDomainsFromAppData(data: AppData): AppData {
  const next: AppData = { ...data }

  if (isNormalizedStripFromBlobEnabled('pedidos')) {
    next.pedidos = []
    next.pedidoPlanilhaEnvio = {}
  }
  if (isNormalizedStripFromBlobEnabled('anexos')) {
    next.arquivos = []
    next.planilhaAnexosPorPedido = {}
  }
  if (isNormalizedStripFromBlobEnabled('historico')) {
    next.historico = []
  }
  if (isNormalizedStripFromBlobEnabled('chat')) {
    next.chatMensagens = []
  }
  if (isNormalizedStripFromBlobEnabled('reversoes')) {
    next.reversoes = []
  }
  if (isNormalizedStripFromBlobEnabled('notificacoes')) {
    next.notificacoes = []
  }
  if (isNormalizedStripFromBlobEnabled('arquivados')) {
    next.processosArquivados = []
  }
  if (isNormalizedStripFromBlobEnabled('cadastros')) {
    next.clinicas = []
    next.empresas = []
    next.materiais = []
    next.usuarios = []
  }
  if (isNormalizedStripFromBlobEnabled('config')) {
    next.workflowEtapas = []
  }
  if (isNormalizedStripFromBlobEnabled('auxiliares')) {
    next.solemp = []
    next.notasFiscais = []
  }

  return next
}
