import type {
  AppData,
  AguardandoEmpenhoItem,
  DashboardMetrics,
  EmpenhadoMesTotal,
  PedidoComDetalhes,
  PedidoFilters,
  WorkflowEtapa,
} from '@/types'
import { enrichPedido } from '@/utils/workflow'
import {
  delay,
  loadFreshAppData,
  peekDemoAppData,
  saveAppData,
  saveDemoAppData,
} from '@/mocks/seed'
import { useCloudAppDataSync } from '@/config/dataSource'
import { flushSupabaseAppDataSync } from '@/data/persistence/supabaseSync'
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { removePedidosFromAppData } from '@/utils/pedidoCleanup'
import { canAccessGestorRoute } from '@/utils/permissions'
import { authService } from '@/services/authService'
import { pedidoEtapaConcluidaParaChave, pedidoPendenteParaChave } from '@/utils/perfilEtapa'

function resolveSetorOrigem(pedido: PedidoComDetalhes): Pick<
  AguardandoEmpenhoItem,
  'setorTipo' | 'setorLabel' | 'setorNome'
> {
  const tipo = pedido.clinica.tipo ?? 'clinica'
  if (tipo === 'medicamento') {
    return { setorTipo: 'medicamento', setorLabel: 'Farmácia', setorNome: pedido.clinica.nome }
  }
  if (tipo === 'empenhado') {
    return { setorTipo: 'empenhado', setorLabel: 'Empenhado', setorNome: pedido.clinica.nome }
  }
  return { setorTipo: 'clinica', setorLabel: 'Clínica', setorNome: pedido.clinica.nome }
}

function resolveValorSolemp(pedido: PedidoComDetalhes): number {
  if (typeof pedido.solemp?.valor === 'number' && Number.isFinite(pedido.solemp.valor)) {
    return pedido.solemp.valor
  }
  return pedido.valor
}

/** Ativo só em Solemp confeccionada (após Confecção concluída; ainda não Empenhado). */
function isAguardandoEmpenhoNaSolempConfeccionada(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
): boolean {
  if (pedido.concluido || !pedido.solemp?.numero) return false

  // Não contar se ainda estiver em Confecção (antes da Solemp confeccionada)
  if (pedidoPendenteParaChave(pedido, etapas, 'DIV_MAT_CONFECCAO_SOLEMP')) return false
  if (!pedidoEtapaConcluidaParaChave(pedido, etapas, 'DIV_MAT_CONFECCAO_SOLEMP')) return false

  // Já passou pelo Empenhado — não está mais aguardando
  if (pedidoEtapaConcluidaParaChave(pedido, etapas, 'DIV_MAT_EMPENHADO')) return false
  if (pedidoPendenteParaChave(pedido, etapas, 'DIV_MAT_EMPENHADO')) return false

  return pedidoPendenteParaChave(pedido, etapas, 'DIV_MAT_FINANCAS')
}

function dataEmpenhadoDoPedido(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
): string | null {
  const etapa = etapas.find((e) => e.chave === 'DIV_MAT_EMPENHADO')
  if (!etapa) return null
  const historico = pedido.etapasHistorico.find(
    (h) =>
      Boolean(h.dataConclusao) &&
      (h.etapaId === etapa.id || h.etapaNome === etapa.nome || h.etapaNome === 'Empenhado'),
  )
  return historico?.dataConclusao ?? null
}

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

function assertGestorPodeExcluir(usuarioId: string, data: AppData): void {
  const gestor = authService.getGestorUser()
  if (gestor?.id === usuarioId && canAccessGestorRoute(gestor.perfil)) {
    return
  }

  const usuario = data.usuarios.find((u) => u.id === usuarioId && u.ativo)
  if (usuario && canAccessGestorRoute(usuario.perfil)) {
    return
  }

  throw new Error('Apenas o gestor pode excluir timelines.')
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
    // Sem delay artificial: listagens do gestor precisam ser responsivas.
    const data = await loadFreshAppData()
    let pedidos = enrichAll(data)

    if (clinicaId) {
      pedidos = pedidos.filter((p) => p.clinicaId === clinicaId)
    }

    return filterPedidos(pedidos, filters)
  },

  async getById(id: string): Promise<PedidoComDetalhes | null> {
    const data = await loadFreshAppData()
    const pedido = data.pedidos.find((p) => p.id === id)
    if (!pedido) return null
    return enrichPedido(pedido, getContext(data))
  },

  async listDemo(filters?: PedidoFilters): Promise<PedidoComDetalhes[]> {
    const data = peekDemoAppData()
    if (!data) return []
    return filterPedidos(enrichAll(data), filters)
  },

  async getDemoById(id: string): Promise<PedidoComDetalhes | null> {
    const data = peekDemoAppData()
    if (!data) return null
    const pedido = data.pedidos.find((p) => p.id === id)
    if (!pedido) return null
    return enrichPedido(pedido, getContext(data))
  },

  async getDashboardMetrics(clinicaId?: string | null): Promise<DashboardMetrics> {
    const data = await loadFreshAppData()
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

    const valorPagoMes = concluidos
      .filter((p) => differenceInCalendarDays(new Date(), parseISO(p.dataSolicitacao)) <= 30)
      .reduce((acc, p) => acc + p.valor, 0)

    const etapas = data.workflowEtapas
    const aguardandoEmpenhoPedidos = emAndamento.filter((p) =>
      isAguardandoEmpenhoNaSolempConfeccionada(p, etapas),
    )
    const aguardandoEmpenhoItens: AguardandoEmpenhoItem[] = aguardandoEmpenhoPedidos
      .map((p) => {
        const setor = resolveSetorOrigem(p)
        return {
          pedidoId: p.id,
          pedidoNumero: p.numero,
          solempNumero: p.solemp!.numero,
          valor: resolveValorSolemp(p),
          ...setor,
          diasNaEtapa: p.diasNaEtapa,
          dataSolicitacao: p.dataSolicitacao,
        }
      })
      .sort((a, b) => b.valor - a.valor)
    const valorAguardandoEmpenho = aguardandoEmpenhoItens.reduce((acc, item) => acc + item.valor, 0)
    const quantidadeAguardandoEmpenho = aguardandoEmpenhoItens.length

    const empenhados = pedidos
      .map((p) => {
        const dataEmpenho = dataEmpenhadoDoPedido(p, etapas)
        if (!dataEmpenho) return null
        const dataParsed = parseISO(dataEmpenho)
        if (!isValid(dataParsed)) return null
        return {
          valor: resolveValorSolemp(p),
          dataEmpenho,
          mesChave: format(dataParsed, 'yyyy-MM'),
          mesLabel: format(dataParsed, 'MMMM/yyyy', { locale: ptBR }),
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    const valorTotalEmpenhado = empenhados.reduce((acc, item) => acc + item.valor, 0)
    const quantidadeTotalEmpenhado = empenhados.length
    const dataPrimeiroEmpenho =
      empenhados.length === 0
        ? null
        : empenhados.reduce(
            (min, item) => (item.dataEmpenho < min ? item.dataEmpenho : min),
            empenhados[0].dataEmpenho,
          )

    const mesMap = new Map<string, EmpenhadoMesTotal>()
    for (const item of empenhados) {
      const current = mesMap.get(item.mesChave) ?? {
        mesChave: item.mesChave,
        mesLabel: item.mesLabel.charAt(0).toUpperCase() + item.mesLabel.slice(1),
        valor: 0,
        quantidade: 0,
      }
      current.valor += item.valor
      current.quantidade += 1
      mesMap.set(item.mesChave, current)
    }
    const totaisEmpenhadoPorMes = Array.from(mesMap.values()).sort((a, b) =>
      a.mesChave < b.mesChave ? 1 : -1,
    )

    // Garante o mês corrente na lista (mesmo zerado) para o filtro
    const mesAtualChave = format(new Date(), 'yyyy-MM')
    if (!mesMap.has(mesAtualChave)) {
      const mesAtualLabel = format(new Date(), 'MMMM/yyyy', { locale: ptBR })
      totaisEmpenhadoPorMes.unshift({
        mesChave: mesAtualChave,
        mesLabel: mesAtualLabel.charAt(0).toUpperCase() + mesAtualLabel.slice(1),
        valor: 0,
        quantidade: 0,
      })
    }

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
      valorPagoMes,
      valorAguardandoEmpenho,
      quantidadeAguardandoEmpenho,
      aguardandoEmpenhoItens,
      valorTotalEmpenhado,
      quantidadeTotalEmpenhado,
      dataPrimeiroEmpenho,
      totaisEmpenhadoPorMes,
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

    const demoSnapshot = peekDemoAppData()
    if (demoSnapshot?.pedidos.some((p) => p.id === pedidoId)) {
      assertGestorPodeExcluir(usuarioId, demoSnapshot)
      removePedidosFromAppData(demoSnapshot, new Set([pedidoId]))
      saveDemoAppData(demoSnapshot)
      return
    }

    const data = await loadFreshAppData()
    assertGestorPodeExcluir(usuarioId, data)

    const pedido = data.pedidos.find((p) => p.id === pedidoId)
    if (!pedido) throw new Error('Timeline não encontrada.')

    removePedidosFromAppData(data, new Set([pedidoId]))
    saveAppData(data)
    if (useCloudAppDataSync()) {
      await flushSupabaseAppDataSync()
    }
  },
}
