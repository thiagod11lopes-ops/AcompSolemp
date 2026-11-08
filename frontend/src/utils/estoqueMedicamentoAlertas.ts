import type { AppData, ListaMedicamentosLinha, Notification, NotificationType } from '@/types'
import { clinicaPlanilhasLivresService } from '@/services/clinicaPlanilhasLivresService'
import {
  getListaMedEstoqueStatus,
  getListaMedValidadeStatus,
} from '@/utils/listaMedicamentosForm'

export const TIPOS_NOTIFICACAO_ESTOQUE_PME: NotificationType[] = [
  'ESTOQUE_BAIXO',
  'ESTOQUE_ZERADO',
  'VALIDADE_PROXIMA',
  'VALIDADE_VENCIDA',
]

function isTipoEstoquePme(tipo: NotificationType): boolean {
  return (TIPOS_NOTIFICACAO_ESTOQUE_PME as string[]).includes(tipo)
}

function nowIso(): string {
  return new Date().toISOString()
}

function stableId(
  tipo: (typeof TIPOS_NOTIFICACAO_ESTOQUE_PME)[number],
  clinicaId: string,
  linhaId: string,
): string {
  return `notif-estoque-${tipo}-${clinicaId}-${linhaId}`
}

function rotuloLinha(linha: ListaMedicamentosLinha): string {
  const nome = linha.medicamento.trim() || 'Medicamento'
  const lote = linha.lote.trim()
  return lote ? `${nome} (lote ${lote})` : nome
}

function alertasDaLinha(linha: ListaMedicamentosLinha): {
  tipo: (typeof TIPOS_NOTIFICACAO_ESTOQUE_PME)[number]
  titulo: string
  mensagem: string
}[] {
  const out: {
    tipo: (typeof TIPOS_NOTIFICACAO_ESTOQUE_PME)[number]
    titulo: string
    mensagem: string
  }[] = []
  const rotulo = rotuloLinha(linha)
  const estoque = getListaMedEstoqueStatus(linha)
  const validade = getListaMedValidadeStatus(linha)

  if (estoque === 'zerado') {
    out.push({
      tipo: 'ESTOQUE_ZERADO',
      titulo: 'Estoque zerado',
      mensagem: `${rotulo}: saldo 0 na Lista de Medicamentos.`,
    })
  } else if (estoque === 'baixo') {
    out.push({
      tipo: 'ESTOQUE_BAIXO',
      titulo: 'Estoque baixo',
      mensagem: `${rotulo}: QTD ${linha.qtd.trim() || '0'} ≤ limite ${linha.estoqueBaixo.trim() || '—'}.`,
    })
  }

  if (validade === 'vencido') {
    out.push({
      tipo: 'VALIDADE_VENCIDA',
      titulo: 'Validade vencida',
      mensagem: `${rotulo}: validade ${linha.validade.trim() || '—'} já passou.`,
    })
  } else if (validade === 'proximo') {
    out.push({
      tipo: 'VALIDADE_PROXIMA',
      titulo: 'Validade próxima',
      mensagem: `${rotulo}: validade ${linha.validade.trim() || '—'} dentro do prazo de aviso.`,
    })
  }

  return out
}

function upsertEstoqueNotif(
  data: AppData,
  input: {
    id: string
    tipo: (typeof TIPOS_NOTIFICACAO_ESTOQUE_PME)[number]
    clinicaId: string
    clinicaNome: string
    titulo: string
    mensagem: string
    agora: string
  },
): boolean {
  const existente = data.notificacoes.find((n) => n.id === input.id)
  const titulo = `${input.titulo} · ${input.clinicaNome}`
  if (existente) {
    let changed = false
    if (existente.mensagem !== input.mensagem || existente.titulo !== titulo) {
      existente.mensagem = input.mensagem
      existente.titulo = titulo
      changed = true
    }
    // Condição ainda ativa: reabre se estava lida e o texto mudou.
    if (existente.lida && changed) {
      existente.lida = false
      existente.data = input.agora
      return true
    }
    return changed
  }

  data.notificacoes.push({
    id: input.id,
    tipo: input.tipo,
    titulo,
    mensagem: input.mensagem,
    pedidoId: null,
    reversaoId: null,
    perfilDestino: 'MEDICAMENTO',
    etapaChave: input.clinicaId,
    lida: false,
    data: input.agora,
  })
  return true
}

/**
 * Gera/atualiza alertas do sininho a partir da Lista de Medicamentos (PME).
 * `etapaChave` = clinicaId para filtrar por clínica logada.
 * Retorna quantas mutações (cria/atualiza/resolve) para decidir persistência.
 */
export function syncEstoqueMedicamentoNotifications(data: AppData): number {
  const agora = nowIso()
  let mutacoes = 0
  const ativos = new Set<string>()
  const clinicasMed = (data.clinicas ?? []).filter((c) => c.tipo === 'medicamento')

  for (const clinica of clinicasMed) {
    const fromApp = data.planilhasLivres?.[clinica.id]
    let linhas = fromApp?.listaMedicamentos?.linhas ?? []
    // Fallback: sticky/backup quando o blob ainda não tem a Lista.
    if (!fromApp || linhas.length === 0) {
      linhas =
        clinicaPlanilhasLivresService.getState(clinica.id, 'medicamento').listaMedicamentos
          ?.linhas ?? []
    }
    const clinicaNome = clinica.nome.trim() || 'Farmácia PME'

    for (const linha of linhas) {
      if (!linha?.id) continue
      for (const alerta of alertasDaLinha(linha)) {
        const id = stableId(alerta.tipo, clinica.id, linha.id)
        ativos.add(id)
        if (
          upsertEstoqueNotif(data, {
            id,
            tipo: alerta.tipo,
            clinicaId: clinica.id,
            clinicaNome,
            titulo: alerta.titulo,
            mensagem: alerta.mensagem,
            agora,
          })
        ) {
          mutacoes += 1
        }
      }
    }
  }

  // Condição resolvida → marca como lida (some do badge, permanece no histórico).
  for (const n of data.notificacoes) {
    if (!isTipoEstoquePme(n.tipo)) continue
    if (ativos.has(n.id)) continue
    if (!n.lida) {
      n.lida = true
      mutacoes += 1
    }
  }

  return mutacoes
}

export function filtrarNotificacoesEstoquePorClinica(
  notificacoes: Notification[],
  clinicaId: string | null | undefined,
): Notification[] {
  if (!clinicaId) return notificacoes
  return notificacoes.filter((n) => {
    if (!isTipoEstoquePme(n.tipo)) return true
    return n.etapaChave === clinicaId
  })
}
