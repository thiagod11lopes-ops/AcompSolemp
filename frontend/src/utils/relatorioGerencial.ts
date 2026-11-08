import type { DashboardMetrics, DashboardPedidoItem } from '@/types'
import { formatCurrency } from '@/utils/format'
import {
  buildGestorBalanco,
  type GestorBalancoPeriodo,
  type GestorBalancoResult,
} from '@/utils/gestorBalanco'

export interface RelatorioLinhaKv {
  indicador: string
  valor: string
}

export interface RelatorioClinicaLinha {
  clinica: string
  origem: string
  total: number
  concluidos: number
  atrasados: number
  valor: number
}

export interface RelatorioOrigemLinha {
  origem: string
  total: number
  concluidos: number
  atrasados: number
  valor: number
  valorEmpenhado: number
}

export interface RelatorioEtapaLinha {
  etapa: string
  quantidade: number
  mediaDias: number
  atrasados: number
  valor: number
}

export interface RelatorioSolempNeLinha {
  pedido: string
  clinica: string
  solemp: string
  ne: string
  valor: number
  data: string
  origem: string
}

export interface RelatorioGerencial {
  periodo: GestorBalancoPeriodo
  periodoLabel: string
  geradoEm: string
  balanco: GestorBalancoResult
  resumo: RelatorioLinhaKv[]
  porClinica: RelatorioClinicaLinha[]
  porOrigem: RelatorioOrigemLinha[]
  tempoPorEtapa: RelatorioEtapaLinha[]
  solempNe: RelatorioSolempNeLinha[]
  processos: DashboardPedidoItem[]
}

function origemLabel(setorTipo: DashboardPedidoItem['setorTipo']): string {
  if (setorTipo === 'medicamento') return 'PME'
  if (setorTipo === 'empenhado') return 'Empenhado'
  return 'OPME'
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10
}

export function buildRelatorioGerencial(
  metrics: DashboardMetrics,
  periodo: GestorBalancoPeriodo,
): RelatorioGerencial {
  const balanco = buildGestorBalanco(metrics, periodo)
  const processos = balanco.processosFiltrados
  const empenhados = balanco.empenhadosFiltrados

  const opme = processos.filter((p) => p.setorTipo === 'clinica')
  const pme = processos.filter((p) => p.setorTipo === 'medicamento')
  const emp = processos.filter((p) => p.setorTipo === 'empenhado')

  const valorEmpenhadoOpme = empenhados
    .filter((e) => e.setorTipo === 'clinica')
    .reduce((s, e) => s + (e.valor || 0), 0)
  const valorEmpenhadoPme = empenhados
    .filter((e) => e.setorTipo === 'medicamento')
    .reduce((s, e) => s + (e.valor || 0), 0)
  const valorEmpenhadoEmp = empenhados
    .filter((e) => e.setorTipo === 'empenhado')
    .reduce((s, e) => s + (e.valor || 0), 0)

  const comSolemp = processos.filter((p) => Boolean(p.solempNumero?.trim()))
  const comNe = empenhados.filter((e) => Boolean(e.empenhoNumero?.trim()))

  const resumo: RelatorioLinhaKv[] = [
    { indicador: 'Período', valor: balanco.periodoLabel },
    { indicador: 'Total de processos', valor: String(balanco.kpis.totalProcessos) },
    { indicador: 'Em andamento', valor: String(balanco.kpis.emAndamento) },
    { indicador: 'Concluídos', valor: String(balanco.kpis.concluidos) },
    { indicador: 'Atrasados', valor: String(balanco.kpis.atrasados) },
    { indicador: 'Próximos do vencimento', valor: String(balanco.kpis.proximosVencimento) },
    {
      indicador: 'Tempo médio até conclusão (dias)',
      valor:
        balanco.kpis.tempoMedioConclusaoDias != null
          ? String(balanco.kpis.tempoMedioConclusaoDias)
          : '—',
    },
    { indicador: 'Valor empenhado (NE)', valor: formatCurrency(balanco.kpis.valorEmpenhado) },
    {
      indicador: 'Qtd. empenhos (NE)',
      valor: String(balanco.kpis.quantidadeEmpenhado),
    },
    { indicador: 'Valor indenizado', valor: formatCurrency(balanco.kpis.valorIndenizado) },
    {
      indicador: 'Aguardando empenho',
      valor: `${formatCurrency(balanco.kpis.valorAguardandoEmpenho)} (${balanco.kpis.quantidadeAguardandoEmpenho})`,
    },
    {
      indicador: 'Processos com SOLEMP',
      valor: String(comSolemp.length),
    },
    {
      indicador: 'Valor processos com SOLEMP',
      valor: formatCurrency(comSolemp.reduce((s, p) => s + (p.valor || 0), 0)),
    },
    { indicador: 'NEs no período', valor: String(comNe.length) },
    {
      indicador: 'OPME — processos / valor',
      valor: `${opme.length} / ${formatCurrency(opme.reduce((s, p) => s + (p.valor || 0), 0))}`,
    },
    {
      indicador: 'PME — processos / valor',
      valor: `${pme.length} / ${formatCurrency(pme.reduce((s, p) => s + (p.valor || 0), 0))}`,
    },
  ]

  const clinicaMap = new Map<string, RelatorioClinicaLinha>()
  for (const p of processos) {
    const key = `${p.clinicaNome}||${origemLabel(p.setorTipo)}`
    const cur = clinicaMap.get(key) ?? {
      clinica: p.clinicaNome || '—',
      origem: origemLabel(p.setorTipo),
      total: 0,
      concluidos: 0,
      atrasados: 0,
      valor: 0,
    }
    cur.total += 1
    if (p.concluido) cur.concluidos += 1
    if (!p.concluido && p.prazoStatus === 'ATRASADO') cur.atrasados += 1
    cur.valor += p.valor || 0
    clinicaMap.set(key, cur)
  }
  const porClinica = [...clinicaMap.values()].sort(
    (a, b) => b.valor - a.valor || b.total - a.total || a.clinica.localeCompare(b.clinica),
  )

  const packOrigem = (
    origem: string,
    itens: DashboardPedidoItem[],
    valorEmpenhado: number,
  ): RelatorioOrigemLinha => ({
    origem,
    total: itens.length,
    concluidos: itens.filter((p) => p.concluido).length,
    atrasados: itens.filter((p) => !p.concluido && p.prazoStatus === 'ATRASADO').length,
    valor: itens.reduce((s, p) => s + (p.valor || 0), 0),
    valorEmpenhado,
  })

  const porOrigem = [
    packOrigem('OPME', opme, valorEmpenhadoOpme),
    packOrigem('PME', pme, valorEmpenhadoPme),
    packOrigem('Empenhado', emp, valorEmpenhadoEmp),
  ].filter((o) => o.total > 0 || o.valorEmpenhado > 0)

  const etapaMap = new Map<
    string,
    { etapa: string; dias: number[]; atrasados: number; valor: number }
  >()
  for (const p of processos) {
    const etapa = (p.etapasAtivasNomes || p.etapaAtual || '—').trim() || '—'
    const cur = etapaMap.get(etapa) ?? { etapa, dias: [], atrasados: 0, valor: 0 }
    if (!p.concluido) {
      cur.dias.push(Math.max(0, p.diasNaEtapa || 0))
      if (p.prazoStatus === 'ATRASADO') cur.atrasados += 1
      cur.valor += p.valor || 0
    } else if (typeof p.diasAteConclusao === 'number' && Number.isFinite(p.diasAteConclusao)) {
      cur.dias.push(Math.max(0, p.diasAteConclusao))
    }
    etapaMap.set(etapa, cur)
  }
  const tempoPorEtapa: RelatorioEtapaLinha[] = [...etapaMap.values()]
    .map((e) => ({
      etapa: e.etapa,
      quantidade: e.dias.length,
      mediaDias: avg(e.dias),
      atrasados: e.atrasados,
      valor: e.valor,
    }))
    .sort((a, b) => b.mediaDias - a.mediaDias || b.quantidade - a.quantidade)

  const solempNeMap = new Map<string, RelatorioSolempNeLinha>()
  for (const p of processos) {
    if (!p.solempNumero?.trim()) continue
    solempNeMap.set(p.pedidoId, {
      pedido: p.pedidoNumero,
      clinica: p.clinicaNome || '—',
      solemp: p.solempNumero.trim(),
      ne: '—',
      valor: p.valor || 0,
      data: p.dataSolicitacao?.slice(0, 10) || '—',
      origem: origemLabel(p.setorTipo),
    })
  }
  for (const e of empenhados) {
    const prev = solempNeMap.get(e.pedidoId)
    solempNeMap.set(e.pedidoId, {
      pedido: e.pedidoNumero,
      clinica: e.clinicaNome || prev?.clinica || '—',
      solemp: e.solempNumero?.trim() || prev?.solemp || '—',
      ne: e.empenhoNumero?.trim() || prev?.ne || '—',
      valor: e.valor || prev?.valor || 0,
      data: e.dataEmpenho?.slice(0, 10) || prev?.data || '—',
      origem: origemLabel(e.setorTipo),
    })
  }
  const solempNe = [...solempNeMap.values()].sort((a, b) =>
    b.data.localeCompare(a.data) || a.pedido.localeCompare(b.pedido),
  )

  return {
    periodo,
    periodoLabel: balanco.periodoLabel,
    geradoEm: new Date().toLocaleString('pt-BR'),
    balanco,
    resumo,
    porClinica,
    porOrigem,
    tempoPorEtapa,
    solempNe,
    processos,
  }
}
