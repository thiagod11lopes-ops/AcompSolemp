import type { AppData, Pedido, UserRole, WorkflowEtapa } from '@/types'
import { PRAZO_CORRECAO_PADRAO_DIAS } from '@/types'
import { formatDate } from '@/utils/format'

function nowIso(): string {
  return new Date().toISOString()
}

function parseIsoDate(iso: string): Date | null {
  const d = new Date(iso)
  return Number.isFinite(d.getTime()) ? d : null
}

/** Dias de calendário entre duas datas (0 = mesmo dia). */
export function diasCalendarioEntre(inicioIso: string, fimIso: string = nowIso()): number | null {
  const inicio = parseIsoDate(inicioIso)
  const fim = parseIsoDate(fimIso)
  if (!inicio || !fim) return null
  const a = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
  const b = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate())
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export function addDiasCalendario(inicioIso: string, dias: number): string {
  const d = parseIsoDate(inicioIso) ?? new Date()
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias)
  out.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds())
  return out.toISOString()
}

export function resolvePrazoCorrecaoDias(
  etapa: Pick<WorkflowEtapa, 'prazoCorrecaoDias'> | null | undefined,
): number {
  const raw = etapa?.prazoCorrecaoDias
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.max(0, Math.min(365, Math.round(raw)))
  }
  return PRAZO_CORRECAO_PADRAO_DIAS
}

export function resolveEtapaDevolveuPlanilha(
  data: Pick<AppData, 'workflowEtapas'>,
  pedido: Pedido,
): WorkflowEtapa | null {
  const hist = pedido.planilhaDevolucoes
  const last = hist?.length ? hist[hist.length - 1] : null
  if (last?.deEtapaChave) {
    return data.workflowEtapas.find((e) => e.chave === last.deEtapaChave) ?? null
  }
  return null
}

export function resolveCorretorPerfil(
  data: AppData,
  pedido: Pedido,
): UserRole | null {
  const destino = pedido.planilhaDevolvidaParaChave
  if (destino === 'SOLICITACAO') {
    const planilha = data.pedidoPlanilhaEnvio?.[pedido.id]
    if (planilha?.formato === 'imhMedicamento') return 'MEDICAMENTO'
    const clinica = data.clinicas.find((c) => c.id === pedido.clinicaId)
    if (clinica?.tipo === 'medicamento') return 'MEDICAMENTO'
    return 'CLINICA'
  }
  if (!destino) return null
  const etapa = data.workflowEtapas.find((e) => e.chave === destino)
  return etapa?.perfilResponsavel ?? null
}

export type StatusPrazoCorrecao = {
  prazoDias: number
  devolvidaEm: string
  vencimentoEm: string
  diasDecorridos: number
  diasRestantes: number
  vencido: boolean
  etapaDevolveu: WorkflowEtapa | null
}

export function resolveStatusPrazoCorrecao(
  data: AppData,
  pedido: Pedido,
  agoraIso: string = nowIso(),
): StatusPrazoCorrecao | null {
  if (!pedido.planilhaDevolvidaParaChave || !pedido.planilhaDevolvidaEm) return null
  const etapaDevolveu = resolveEtapaDevolveuPlanilha(data, pedido)
  const prazoDias = resolvePrazoCorrecaoDias(etapaDevolveu)
  const diasDecorridos = diasCalendarioEntre(pedido.planilhaDevolvidaEm, agoraIso)
  if (diasDecorridos == null || diasDecorridos < 0) return null
  const vencimentoEm = addDiasCalendario(pedido.planilhaDevolvidaEm, prazoDias)
  const vencido = diasDecorridos > prazoDias
  const diasRestantes = Math.max(0, prazoDias - diasDecorridos)
  return {
    prazoDias,
    devolvidaEm: pedido.planilhaDevolvidaEm,
    vencimentoEm,
    diasDecorridos,
    diasRestantes,
    vencido,
    etapaDevolveu,
  }
}

export function formatMensagemPrazoCorrecao(status: StatusPrazoCorrecao): string {
  const ate = formatDate(status.vencimentoEm)
  if (status.vencido) {
    const atraso = status.diasDecorridos - status.prazoDias
    return `Prazo de correção: ${status.prazoDias} dia(s) (venceu em ${ate}). Situação: PRAZO VENCIDO${
      atraso > 0 ? ` há ${atraso} dia(s)` : ''
    }.`
  }
  return `Prazo de correção: ${status.prazoDias} dia(s) (até ${ate}). ${
    status.diasRestantes === 0
      ? 'Vence hoje.'
      : `Restam ${status.diasRestantes} dia(s).`
  }`
}

/** Marca como lidas as notificações de prazo de correção do pedido (após reenvio). */
export function marcarPrazoCorrecaoNotificationsLidas(
  data: Pick<AppData, 'notificacoes'>,
  pedidoId: string,
): void {
  data.notificacoes.forEach((n) => {
    if (
      n.pedidoId === pedidoId &&
      n.tipo === 'PRAZO_CORRECAO_VENCIDO' &&
      !n.lida
    ) {
      n.lida = true
    }
  })
}

/**
 * Garante notificação ao corretor quando o prazo de correção da planilha devolvida venceu.
 */
export function syncPrazoCorrecaoNotifications(data: AppData): void {
  const agora = nowIso()
  for (const pedido of data.pedidos) {
    if (pedido.concluido) continue
    if (!pedido.planilhaDevolvidaParaChave || !pedido.planilhaDevolvidaEm) continue

    const status = resolveStatusPrazoCorrecao(data, pedido, agora)
    if (!status?.vencido) continue

    const perfil = resolveCorretorPerfil(data, pedido)
    if (!perfil) continue

    const jaExiste = data.notificacoes.some(
      (n) =>
        n.pedidoId === pedido.id &&
        n.tipo === 'PRAZO_CORRECAO_VENCIDO' &&
        !n.lida,
    )
    if (jaExiste) continue

    data.notificacoes.push({
      id: `notif-prazo-correcao-${pedido.id}-${Date.now()}`,
      tipo: 'PRAZO_CORRECAO_VENCIDO',
      titulo: `Prazo de correção vencido — ${pedido.numero}`,
      mensagem: `A planilha devolvida do processo ${pedido.numero} está com o prazo de correção vencido. ${formatMensagemPrazoCorrecao(status)} Corrija e reenvie pela timeline.`,
      pedidoId: pedido.id,
      reversaoId: null,
      perfilDestino: perfil,
      etapaChave: pedido.planilhaDevolvidaParaChave,
      lida: false,
      data: agora,
    })
  }
}
