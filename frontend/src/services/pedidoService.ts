import type {
  AppData,
  DashboardMetrics,
  PedidoComDetalhes,
  PedidoFilters,
} from '@/types'
import { enrichPedido } from '@/utils/workflow'
import { delay, loadAppData, saveAppData } from '@/mocks/seed'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { removePedidosFromAppData } from '@/utils/pedidoCleanup'
import { canAccessGestorRoute } from '@/utils/permissions'

function getContext(data: AppData) {
  return {
    clinicas: data.clinicas,
    empresas: data.empresas,
    materiais: data.materiais,
    etapas: data.workflowEtapas,
    usuarios: data.usuarios,
    solemp: data.solemp,
    notasFiscais: data.notasFiscais,
  }
}

function enrichAll(data: AppData): PedidoComDetalhes[] {
  const context = getContext(data)
  return data.pedidos
    .map((p) => enrichPedido(p, context))
    .filter((p): p is PedidoComDetalhes => p !== null)
}

function filterPedidos(pedidos: PedidoComDetalhes[], filters?: PedidoFilters) {
  if (!filters) return pedidos

  return pedidos.filter((p) => {
    if (filters.clinicaId && p.clinicaId !== filters.clinicaId) return false
    if (filters.empresaId && p.empresaId !== filters.empresaId) return false
    if (filters.responsavelId && p.responsavelAtualId !== filters.responsavelId) return false
    if (filters.etapaId && p.etapaAtualId !== filters.etapaId) return false
    if (filters.materialId && p.materialId !== filters.materialId) return false
    if (filters.status === 'CONCLUIDO' && !p.concluido) return false
    if (filters.status === 'EM_ANDAMENTO' && p.concluido) return false
    if (
      filters.status &&
      ['NO_PRAZO', 'PROXIMO_VENCIMENTO', 'ATRASADO'].includes(filters.status) &&
      p.prazoStatus !== filters.status
    ) {
      return false
    }
    if (filters.valorMin !== undefined && p.valor < filters.valorMin) return false
    if (filters.valorMax !== undefined && p.valor > filters.valorMax) return false
    if (filters.dataInicio && parseISO(p.dataSolicitacao) < parseISO(filters.dataInicio)) return false
    if (filters.dataFim && parseISO(p.dataSolicitacao) > parseISO(filters.dataFim)) return false
    if (filters.busca) {
      const term = filters.busca.toLowerCase()
      const match =
        p.numero.toLowerCase().includes(term) ||
        p.clinica.nome.toLowerCase().includes(term) ||
        p.empresa.nomeFantasia.toLowerCase().includes(term) ||
        p.material.descricao.toLowerCase().includes(term)
      if (!match) return false
    }
    return true
  })
}

export const pedidoService = {
  async list(filters?: PedidoFilters, clinicaId?: string | null): Promise<PedidoComDetalhes[]> {
    await delay(null)
    const data = loadAppData()
    let pedidos = enrichAll(data)

    if (clinicaId) {
      pedidos = pedidos.filter((p) => p.clinicaId === clinicaId)
    }

    return filterPedidos(pedidos, filters)
  },

  async getById(id: string): Promise<PedidoComDetalhes | null> {
    await delay(null)
    const data = loadAppData()
    const pedido = data.pedidos.find((p) => p.id === id)
    if (!pedido) return null
    return enrichPedido(pedido, getContext(data))
  },

  async getDashboardMetrics(clinicaId?: string | null): Promise<DashboardMetrics> {
    await delay(null, 500)
    const data = loadAppData()
    let pedidos = enrichAll(data)

    if (clinicaId) {
      pedidos = pedidos.filter((p) => p.clinicaId === clinicaId)
    }

    const emAndamento = pedidos.filter((p) => !p.concluido)
    const concluidos = pedidos.filter((p) => p.concluido)
    const atrasados = emAndamento.filter((p) => p.prazoStatus === 'ATRASADO')
    const proximosVencimento = emAndamento.filter(
      (p) => p.prazoStatus === 'PROXIMO_VENCIMENTO',
    )

    const tempoMedioPagamento =
      concluidos.length > 0
        ? concluidos.reduce((acc, p) => {
            const dias = differenceInCalendarDays(
              new Date(),
              parseISO(p.dataSolicitacao),
            )
            return acc + dias
          }, 0) / concluidos.length
        : 0

    const etapaMap = new Map<string, number[]>()
    pedidos.forEach((p) => {
      p.etapasHistorico.forEach((h) => {
        if (h.dataConclusao) {
          const dias = differenceInCalendarDays(
            parseISO(h.dataConclusao),
            parseISO(h.dataInicio),
          )
          const list = etapaMap.get(h.etapaNome) ?? []
          list.push(dias)
          etapaMap.set(h.etapaNome, list)
        }
      })
    })

    const tempoMedioPorEtapa = Array.from(etapaMap.entries()).map(([etapa, dias]) => ({
      etapa,
      dias: dias.reduce((a, b) => a + b, 0) / dias.length,
    }))

    const valorTotalAberto = emAndamento.reduce((acc, p) => acc + p.valor, 0)
    const valorPagoMes = concluidos
      .filter((p) => differenceInCalendarDays(new Date(), parseISO(p.dataSolicitacao)) <= 30)
      .reduce((acc, p) => acc + p.valor, 0)

    const valorAguardandoAssinatura = emAndamento
      .filter((p) => {
        const ids = p.etapasAtivasIds?.length ? p.etapasAtivasIds : [p.etapaAtualId]
        return p.etapasHistorico.some(
          (h) =>
            ids.includes(h.etapaId) &&
            !h.dataConclusao &&
            (h.etapaNome.includes('Assinatura') || h.etapaNome.includes('Confecção')),
        )
      })
      .reduce((acc, p) => acc + p.valor, 0)

    const valorAguardandoFinanceiro = emAndamento
      .filter((p) => {
        const ids = p.etapasAtivasIds?.length ? p.etapasAtivasIds : [p.etapaAtualId]
        return p.etapasHistorico.some(
          (h) =>
            ids.includes(h.etapaId) &&
            !h.dataConclusao &&
            h.etapaNome === 'Finanças Pagamento',
        )
      })
      .reduce((acc, p) => acc + p.valor, 0)

    const clinicaRanking = new Map<string, { total: number; valor: number }>()
    pedidos.forEach((p) => {
      const current = clinicaRanking.get(p.clinica.nome) ?? { total: 0, valor: 0 }
      clinicaRanking.set(p.clinica.nome, {
        total: current.total + 1,
        valor: current.valor + p.valor,
      })
    })

    const empresaRanking = new Map<string, { total: number; valor: number }>()
    pedidos.forEach((p) => {
      const current = empresaRanking.get(p.empresa.nomeFantasia) ?? { total: 0, valor: 0 }
      empresaRanking.set(p.empresa.nomeFantasia, {
        total: current.total + 1,
        valor: current.valor + p.valor,
      })
    })

    const responsavelRanking = new Map<string, { total: number; atrasados: number }>()
    emAndamento.forEach((p) => {
      const nome = p.responsavelAtual?.nome ?? 'Não atribuído'
      const current = responsavelRanking.get(nome) ?? { total: 0, atrasados: 0 }
      responsavelRanking.set(nome, {
        total: current.total + 1,
        atrasados: current.atrasados + (p.prazoStatus === 'ATRASADO' ? 1 : 0),
      })
    })

    const gargaloMap = new Map<string, { dias: number[]; atrasados: number }>()
    emAndamento.forEach((p) => {
      const current = gargaloMap.get(p.etapaAtual.nome) ?? { dias: [], atrasados: 0 }
      current.dias.push(p.diasNaEtapa)
      if (p.prazoStatus === 'ATRASADO') current.atrasados += 1
      gargaloMap.set(p.etapaAtual.nome, current)
    })

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']
    const processosPorMes = meses.map((mes, i) => ({
      mes,
      total: Math.floor(pedidos.length / 6) + (i % 3),
      concluidos: Math.floor(concluidos.length / 6) + (i % 2),
    }))

    const valorPorEtapaMap = new Map<string, number>()
    emAndamento.forEach((p) => {
      valorPorEtapaMap.set(
        p.etapaAtual.nome,
        (valorPorEtapaMap.get(p.etapaAtual.nome) ?? 0) + p.valor,
      )
    })

    return {
      totalProcessos: pedidos.length,
      emAndamento: emAndamento.length,
      concluidos: concluidos.length,
      atrasados: atrasados.length,
      proximosVencimento: proximosVencimento.length,
      tempoMedioPagamento: Math.round(tempoMedioPagamento),
      tempoMedioPorEtapa,
      valorTotalAberto,
      valorPagoMes,
      valorAguardandoAssinatura,
      valorAguardandoFinanceiro,
      rankingClinicas: Array.from(clinicaRanking.entries())
        .map(([nome, v]) => ({ nome, ...v }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5),
      rankingEmpresas: Array.from(empresaRanking.entries())
        .map(([nome, v]) => ({ nome, ...v }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5),
      rankingResponsaveis: Array.from(responsavelRanking.entries())
        .map(([nome, v]) => ({ nome, ...v }))
        .sort((a, b) => b.atrasados - a.atrasados)
        .slice(0, 5),
      rankingGargalos: Array.from(gargaloMap.entries())
        .map(([etapa, v]) => ({
          etapa,
          mediaDias: v.dias.reduce((a, b) => a + b, 0) / (v.dias.length || 1),
          atrasados: v.atrasados,
        }))
        .sort((a, b) => b.mediaDias - a.mediaDias)
        .slice(0, 5),
      processosPorMes,
      valorPorEtapa: Array.from(valorPorEtapaMap.entries()).map(([etapa, valor]) => ({
        etapa,
        valor,
      })),
    }
  },

  persist(data: AppData): void {
    saveAppData(data)
  },

  async deleteById(pedidoId: string, usuarioId: string): Promise<void> {
    await delay(null, 300)
    const data = loadAppData()
    const usuario = data.usuarios.find((u) => u.id === usuarioId && u.ativo)
    if (!usuario || !canAccessGestorRoute(usuario.perfil)) {
      throw new Error('Apenas o gestor pode excluir timelines.')
    }

    const pedido = data.pedidos.find((p) => p.id === pedidoId)
    if (!pedido) throw new Error('Timeline não encontrada.')

    removePedidosFromAppData(data, new Set([pedidoId]))
    saveAppData(data)
  },
}
