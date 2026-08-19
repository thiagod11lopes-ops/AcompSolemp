import type { AppData, Notification, NotificationType } from '@/types'

export const TIPOS_NOTIFICACAO_REVERSAO: NotificationType[] = ['REVERSAO_TIMELINE']

export function notificacaoPertenceAosTipos(
  n: Notification,
  tipos?: NotificationType[],
  excludeTipos?: NotificationType[],
): boolean {
  if (tipos && tipos.length > 0 && !tipos.includes(n.tipo)) return false
  if (excludeTipos && excludeTipos.length > 0 && excludeTipos.includes(n.tipo)) return false
  return true
}

/** Marca como lidas as notificações de reversão ligadas a uma devolução/etapa. */
export function marcarNotificacoesReversaoComoLidas(
  data: Pick<AppData, 'notificacoes'>,
  reversaoId: string,
): void {
  data.notificacoes.forEach((n) => {
    if (n.tipo === 'REVERSAO_TIMELINE' && n.reversaoId === reversaoId) {
      n.lida = true
    }
  })
}
