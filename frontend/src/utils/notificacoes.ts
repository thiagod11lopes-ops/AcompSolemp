import type { Notification, NotificationType } from '@/types'

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
