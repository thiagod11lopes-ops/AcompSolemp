import type { AppData, Notification, Pedido, UserRole, WorkflowEtapa } from '@/types'
import { formatDate } from '@/utils/format'
import { diasCalendarioEntre } from '@/utils/prazoCorrecao'
import {
  calcularDiasNaEtapa,
  calcularPrazoStatus,
  getEtapaAtual,
  resolveAlertaVencimentoDias,
} from '@/utils/workflow'

const ATRASADO_REABRIR_DIAS = 2

function nowIso(): string {
  return new Date().toISOString()
}

function stableId(tipo: 'VENCENDO' | 'ATRASADO', pedidoId: string, etapaChave: string): string {
  return `notif-prazo-${tipo}-${pedidoId}-${etapaChave}`
}

/** Perfil que deve receber o alerta da etapa atual (clínica/medicamento/empenhado resolvidos). */
export function resolvePerfilDestinoPrazoEtapa(
  data: Pick<AppData, 'clinicas'>,
  pedido: Pedido,
  etapa: WorkflowEtapa,
): UserRole | null {
  const perfil = etapa.perfilResponsavel
  if (!perfil) return null
  if (perfil === 'ADMINISTRADOR' || perfil === 'CONSULTA') return null
  if (perfil === 'CLINICA') {
    const clinica = data.clinicas.find((c) => c.id === pedido.clinicaId)
    if (clinica?.tipo === 'medicamento') return 'MEDICAMENTO'
    if (clinica?.tipo === 'empenhado') return 'EMPENHADO'
    return 'CLINICA'
  }
  return perfil
}

export function marcarPrazoEtapaNotificationsLidas(
  data: Pick<AppData, 'notificacoes'>,
  pedidoId: string,
  etapaChave?: string | null,
): void {
  data.notificacoes.forEach((n) => {
    if (n.pedidoId !== pedidoId) return
    if (n.tipo !== 'VENCENDO' && n.tipo !== 'ATRASADO') return
    if (etapaChave && n.etapaChave && n.etapaChave !== etapaChave) return
    if (!n.lida) n.lida = true
  })
}

function findByStableId(data: AppData, id: string): Notification | undefined {
  return data.notificacoes.find((n) => n.id === id)
}

function upsertPrazoNotif(
  data: AppData,
  input: {
    tipo: 'VENCENDO' | 'ATRASADO'
    pedido: Pedido
    etapa: WorkflowEtapa
    perfilDestino: UserRole
    titulo: string
    mensagem: string
    agora: string
    /** Se true, reabre notificação lida (atraso persistente). */
    reabrirSeLida?: boolean
  },
): boolean {
  const id = stableId(input.tipo, input.pedido.id, input.etapa.chave)
  const existente = findByStableId(data, id)
  if (existente) {
    if (!existente.lida) {
      // Mantém a não lida; só atualiza texto se a mensagem mudou (dias restantes).
      if (existente.mensagem !== input.mensagem) {
        existente.mensagem = input.mensagem
        existente.titulo = input.titulo
      }
      return false
    }
    if (!input.reabrirSeLida) return false
    const diasDesde = diasCalendarioEntre(existente.data, input.agora)
    if (diasDesde == null || diasDesde < ATRASADO_REABRIR_DIAS) return false
    existente.lida = false
    existente.data = input.agora
    existente.titulo = input.titulo
    existente.mensagem = input.mensagem
    existente.perfilDestino = input.perfilDestino
    return true
  }

  data.notificacoes.push({
    id,
    tipo: input.tipo,
    titulo: input.titulo,
    mensagem: input.mensagem,
    pedidoId: input.pedido.id,
    reversaoId: null,
    perfilDestino: input.perfilDestino,
    etapaChave: input.etapa.chave,
    lida: false,
    data: input.agora,
  })
  return true
}

/**
 * Gera alertas proativos de prazo da etapa atual:
 * - VENCENDO quando entra na janela alertaVencimentoDias
 * - ATRASADO quando ultrapassa prazoDias (reabre a cada 2 dias se marcado como lido)
 * Idempotente (ids estáveis por pedido+etapa+tipo).
 */
export function syncPrazoEtapaNotifications(data: AppData): number {
  const agora = nowIso()
  let createdOrReopened = 0

  for (const pedido of data.pedidos) {
    if (pedido.concluido) {
      marcarPrazoEtapaNotificationsLidas(data, pedido.id)
      continue
    }

    const etapa = getEtapaAtual(pedido, data.workflowEtapas)
    if (!etapa) continue

    const perfilDestino = resolvePerfilDestinoPrazoEtapa(data, pedido, etapa)
    if (!perfilDestino) continue

    const diasNaEtapa = calcularDiasNaEtapa(pedido)
    const alertaDias = resolveAlertaVencimentoDias(etapa.alertaVencimentoDias, etapa.prazoDias)
    const status = calcularPrazoStatus(diasNaEtapa, etapa.prazoDias, alertaDias)
    const diasRestantes = etapa.prazoDias - diasNaEtapa
    const vencimentoEm = (() => {
      const atual = pedido.etapasHistorico.find((h) => h.dataConclusao === null)
      if (!atual?.dataInicio) return null
      const d = new Date(atual.dataInicio)
      if (!Number.isFinite(d.getTime())) return null
      d.setDate(d.getDate() + etapa.prazoDias)
      return d.toISOString()
    })()
    const vencLabel = vencimentoEm ? formatDate(vencimentoEm) : null

    // Alertas de etapas anteriores (já avançadas) não devem ficar abertos.
    data.notificacoes.forEach((n) => {
      if (n.pedidoId !== pedido.id) return
      if (n.tipo !== 'VENCENDO' && n.tipo !== 'ATRASADO') return
      if (n.etapaChave && n.etapaChave !== etapa.chave && !n.lida) {
        n.lida = true
      }
    })

    if (status === 'NO_PRAZO') {
      marcarPrazoEtapaNotificationsLidas(data, pedido.id, etapa.chave)
      continue
    }

    if (status === 'PROXIMO_VENCIMENTO') {
      // Se ainda não venceu, fecha eventual ATRASADO residual.
      const atrId = stableId('ATRASADO', pedido.id, etapa.chave)
      const atr = findByStableId(data, atrId)
      if (atr && !atr.lida) atr.lida = true

      const diasTxt =
        diasRestantes <= 0
          ? 'Vence hoje'
          : diasRestantes === 1
            ? 'Vence amanhã (resta 1 dia)'
            : `Restam ${diasRestantes} dia(s)`
      const ok = upsertPrazoNotif(data, {
        tipo: 'VENCENDO',
        pedido,
        etapa,
        perfilDestino,
        titulo: `Prazo próximo — ${pedido.numero}`,
        mensagem: `O processo ${pedido.numero} está próximo do vencimento na etapa ${etapa.nome}. ${diasTxt}${
          vencLabel ? ` (até ${vencLabel})` : ''
        }. Acesse a timeline para atuar.`,
        agora,
      })
      if (ok) createdOrReopened += 1
      continue
    }

    // ATRASADO
    const vencId = stableId('VENCENDO', pedido.id, etapa.chave)
    const venc = findByStableId(data, vencId)
    if (venc && !venc.lida) venc.lida = true

    const atraso = Math.abs(Math.min(0, diasRestantes))
    const atrasoTxt =
      atraso === 0
        ? 'Venceu hoje'
        : atraso === 1
          ? 'Atrasado há 1 dia'
          : `Atrasado há ${atraso} dia(s)`
    const ok = upsertPrazoNotif(data, {
      tipo: 'ATRASADO',
      pedido,
      etapa,
      perfilDestino,
      titulo: `Prazo vencido — ${pedido.numero}`,
      mensagem: `O processo ${pedido.numero} está atrasado na etapa ${etapa.nome}. ${atrasoTxt}${
        vencLabel ? ` (venceu em ${vencLabel})` : ''
      }. Regularize na timeline.`,
      agora,
      reabrirSeLida: true,
    })
    if (ok) createdOrReopened += 1
  }

  return createdOrReopened
}
